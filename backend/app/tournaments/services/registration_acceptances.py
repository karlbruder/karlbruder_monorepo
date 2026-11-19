"""Record acceptance choices and detect changed registration configuration."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, TypedDict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.files.models import ArchivedFile
from app.tournaments.exceptions import RegistrationConflictError
from app.tournaments.models import TournamentDocument, TournamentDocumentVersion
from app.tournaments.models.registration_acceptance import RegistrationAcceptance

if TYPE_CHECKING:
    from app.tournaments.models import Tournament
    from app.tournaments.schemas import RegistrationCreate

DECLARATIONS = json.loads(
    (Path(__file__).parents[1] / "declaration_content.json").read_text()
)
CHOICE_FIELDS = (
    "declares_truthful_information",
    "declares_has_required_equipment",
    "declares_physically_fit",
    "accepts_rules",
    "accepts_data_processing",
    "acknowledges_inherent_risks",
    "accepts_cancellation_policy",
)


class PolicyVersionDescriptor(TypedDict):
    version_id: int
    original_file_name: str
    content_type: str


PolicyVersions = dict[str, PolicyVersionDescriptor]


def current_policy_versions(
    session: Session, tournament_ids: list[int]
) -> dict[int, PolicyVersions]:
    if not tournament_ids:
        return {}
    documents = (
        session.scalars(
            select(TournamentDocument)
            .where(
                TournamentDocument.tournament_id.in_(tournament_ids),
                TournamentDocument.purpose.is_not(None),
            )
            .options(
                joinedload(TournamentDocument.versions)
                .joinedload(TournamentDocumentVersion.archive)
                .joinedload(ArchivedFile.file)
            )
            .execution_options(populate_existing=True)
        )
        .unique()
        .all()
    )
    snapshots: dict[int, PolicyVersions] = {
        tournament_id: {} for tournament_id in tournament_ids
    }
    for document in documents:
        version = document.current_version
        if document.purpose is not None and version is not None:
            snapshots[document.tournament_id][document.purpose] = {
                "version_id": version.id,
                "original_file_name": version.archive.file.original_file_name,
                "content_type": version.archive.file.content_type,
            }
    return snapshots


def build_registration_acceptance_content(
    tournament: Tournament, language: str, versions: PolicyVersions | None = None
) -> dict:
    versions = versions or {}
    policies = {
        name: {
            "text": getattr(tournament, f"{name}_text"),
            "source_url": getattr(tournament, f"{name}_url"),
            "document": versions.get(name),
        }
        for name in ("rules", "cancellation_policy")
    }
    return {
        "language": language,
        "declarations": DECLARATIONS[language],
        "equipment_requirements": tournament.equipment_requirements,
        "policies": policies,
    }


def calculate_registration_acceptance_digest(content: dict) -> str:
    return hashlib.sha256(
        json.dumps(
            content, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode()
    ).hexdigest()


def create_registration_acceptance(
    session: Session,
    tournament: Tournament,
    user_id: UUID,
    payload: RegistrationCreate,
    source_ip: str,
) -> RegistrationAcceptance:
    versions = current_policy_versions(session, [tournament.id])[tournament.id]
    content = build_registration_acceptance_content(
        tournament, payload.acceptance_language, versions
    )
    if calculate_registration_acceptance_digest(content) != payload.acceptance_token:
        raise RegistrationConflictError(
            "Registration terms changed; refresh before accepting"
        )
    rules = versions.get("rules")
    cancellation_policy = versions.get("cancellation_policy")
    return RegistrationAcceptance(
        accepted_by_user_id=user_id,
        rules_version_id=rules["version_id"] if rules else None,
        cancellation_policy_version_id=cancellation_policy["version_id"]
        if cancellation_policy
        else None,
        **{name: getattr(payload, name) for name in CHOICE_FIELDS},
        accepted_at=datetime.now(timezone.utc),
        accepted_from_ip=source_ip,
        language=payload.acceptance_language,
    )
