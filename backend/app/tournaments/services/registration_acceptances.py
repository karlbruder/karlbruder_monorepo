"""Bind displayed draft declarations and preserved policies to immutable choices."""

from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING
from uuid import UUID
import json
from datetime import datetime, timezone
from pathlib import Path

from app.tournaments.exceptions import (
    RegistrationConflictError,
    RegistrationNotAllowedError,
)
from app.tournaments.models.registration_acceptance import RegistrationAcceptance

if TYPE_CHECKING:
    from app.tournaments.models import Tournament, TournamentRegistration
    from app.tournaments.schemas import RegistrationCreate, RegistrationRead

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
    "authorizes_image_use",
)


def acceptance_content(tournament: Tournament, language: str) -> dict:
    policies = {}
    for name in ("rules", "cancellation_policy"):
        source = getattr(tournament, f"{name}_url")
        archive = getattr(tournament, f"{name}_archive")
        if source and (archive is None or archive.source_url != source):
            raise RegistrationNotAllowedError(
                "Registration policy archive is not configured"
            )
        policies[name] = {
            "text": getattr(tournament, f"{name}_text"),
            "source_url": source,
            "archive_id": archive.id if archive else None,
            "sha256": archive.sha256 if archive else None,
        }
    return {
        "declarations_version": "draft-1",
        "language": language,
        "declarations": DECLARATIONS[language],
        "terms_version": tournament.terms_version,
        "rules_version": tournament.rules_version,
        "equipment_requirements": tournament.equipment_requirements,
        "policies": policies,
    }


def content_digest(content: dict) -> str:
    return hashlib.sha256(
        json.dumps(
            content, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode()
    ).hexdigest()


def create_acceptance(
    tournament: Tournament, user_id: UUID, payload: RegistrationCreate, source_ip: str
) -> RegistrationAcceptance:
    content = acceptance_content(tournament, payload.acceptance_language)
    digest = content_digest(content)
    if digest != payload.acceptance_token:
        raise RegistrationConflictError(
            "Registration terms changed; refresh before accepting"
        )
    return RegistrationAcceptance(
        accepted_by_user_id=user_id,
        **{name: getattr(payload, name) for name in CHOICE_FIELDS},
        accepted_terms_version=tournament.terms_version,
        accepted_rules_version=tournament.rules_version,
        accepted_at=datetime.now(timezone.utc),
        accepted_from_ip=source_ip,
        language=payload.acceptance_language,
        content_digest=digest,
        content=content,
        rules_archive_id=tournament.rules_archive_id,
        cancellation_policy_archive_id=tournament.cancellation_policy_archive_id,
    )


def project_registration(registration: TournamentRegistration, *, staff: bool = False) -> RegistrationRead:
    """Read the latest snapshot through the established owner or staff allowlist."""
    from app.tournaments.schemas import RegistrationRead, StaffRegistrationRead

    schema = StaffRegistrationRead if staff else RegistrationRead
    snapshot = registration.acceptances[-1]
    evidence_fields = {*CHOICE_FIELDS, "accepted_terms_version", "accepted_rules_version", "accepted_at", "accepted_from_ip"}
    from app.tournaments.services.tournament_local_dates import is_minor_at_tournament_start

    values = {
        name: getattr(snapshot if name in evidence_fields else registration, name)
        for name in schema.model_fields if name != "parental_consent_required"
    }
    values["parental_consent_required"] = (
        registration.registration_status != "cancelled"
        and is_minor_at_tournament_start(registration.birth_date, registration.tournament.starts_at)
        and not any(document.document_type == "parental_consent_form" for document in registration.documents)
    )
    return schema(**values)
