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


def build_registration_acceptance_content(tournament: Tournament, language: str) -> dict:
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
    tournament: Tournament, user_id: UUID, payload: RegistrationCreate, source_ip: str
) -> RegistrationAcceptance:
    content = build_registration_acceptance_content(tournament, payload.acceptance_language)
    if calculate_registration_acceptance_digest(content) != payload.acceptance_token:
        raise RegistrationConflictError(
            "Registration terms changed; refresh before accepting"
        )
    return RegistrationAcceptance(
        accepted_by_user_id=user_id,
        **{name: getattr(payload, name) for name in CHOICE_FIELDS},
        accepted_at=datetime.now(timezone.utc),
        accepted_from_ip=source_ip,
        language=payload.acceptance_language,
        content=content,
        rules_archive_id=tournament.rules_archive_id,
        cancellation_policy_archive_id=tournament.cancellation_policy_archive_id,
    )
