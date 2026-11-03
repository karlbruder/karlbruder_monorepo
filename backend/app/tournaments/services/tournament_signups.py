"""Create and load tournament registration rows."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_application_role
from app.models import User
from app.tournaments.models import Tournament, TournamentSignup
from . import tournament_local_dates
from .tournament_inscriptions import (
    MAX_TOURNAMENT_INSCRIPTION_SERIAL,
    format_tournament_inscription_number,
)

if TYPE_CHECKING:
    from app.tournaments.schemas import SignupCreate

_DUPLICATE_CONSTRAINTS = {
    "uq_tournament_signups_active_user",
    "uq_tournament_signups_active_email",
    "uq_tournament_signups_active_document",
}
_SQLITE_DUPLICATE_COLUMNS = (
    "tournament_signups.tournament_id, tournament_signups.user_id",
    "tournament_signups.tournament_id, tournament_signups.email_normalized",
    "tournament_signups.tournament_id, tournament_signups.document_id_normalized",
)


def normalize_tournament_registration_identity(value: str) -> str:
    """Return a normalized email or document string for duplicate checks (REG-012).

    Do not use this value as a deliverable email address.
    """

    return re.sub(r"[\s.\-]", "", value).lower()


def visible_tournament(
    session: Session, tournament_id: int, user: User, *, lock: bool = False
) -> Tournament:
    """Load a tournament the caller may see, optionally with a row lock.

    Regular users receive 404 for internal events. Missing rows also return 404.
    """

    query = select(Tournament).where(Tournament.id == tournament_id)
    if get_application_role(user) not in ("guild_member", "admin"):
        query = query.where(Tournament.is_internal.is_(False))
    if lock:
        query = query.with_for_update()
    tournament = session.scalar(query)
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


def create_tournament_signup(
    session: Session,
    tournament_id: int,
    user: User,
    payload: SignupCreate,
    acceptance_ip: str,
) -> TournamentSignup:
    """Create a tournament registration row, assign the next inscription number, and commit."""

    email_normalized = normalize_tournament_registration_identity(payload.email)
    document_normalized = normalize_tournament_registration_identity(payload.document_id)
    account_email_normalized = (
        normalize_tournament_registration_identity(user.email) if user.email else ""
    )
    email_parts = email_normalized.split("@")
    if len(email_parts) != 2 or not all(email_parts) or not document_normalized:
        raise HTTPException(status_code=400, detail="Invalid email or identity document")
    if email_normalized != account_email_normalized:
        raise HTTPException(status_code=400, detail="Registration email must match account email")

    tournament = visible_tournament(session, tournament_id, user, lock=True)
    today = tournament_local_dates.current_local_calendar_date()
    if (
        tournament.registration_opens_on is None
        or tournament.registration_closes_on is None
        or tournament.new_registrations_closed
        or not tournament.registration_opens_on <= today <= tournament.registration_closes_on
    ):
        raise HTTPException(status_code=400, detail="Registration is closed")
    if not tournament.terms_version or not tournament.regulation_version:
        raise HTTPException(status_code=400, detail="Registration terms are not configured")
    if tournament.next_inscription_serial > MAX_TOURNAMENT_INSCRIPTION_SERIAL:
        raise HTTPException(status_code=409, detail="Inscription number capacity exhausted")

    serial = tournament.next_inscription_serial
    tournament.next_inscription_serial = serial + 1
    signup = TournamentSignup(
        **payload.model_dump(),
        tournament_id=tournament.id,
        user_id=user.id,
        inscription_number=format_tournament_inscription_number(tournament.id, serial),
        status="awaiting_payment",
        email_normalized=email_normalized,
        document_id_normalized=document_normalized,
        accepted_terms_version=tournament.terms_version,
        accepted_regulation_version=tournament.regulation_version,
        accepted_at=datetime.now(timezone.utc),
        acceptance_ip=acceptance_ip,
    )
    session.add(signup)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if is_duplicate_tournament_signup(exc):
            raise HTTPException(status_code=409, detail="Registration already exists") from exc
        raise
    session.refresh(signup)
    return signup


def is_duplicate_tournament_signup(exc: IntegrityError) -> bool:
    """Return whether ``exc`` is a known active tournament registration uniqueness violation."""

    original = exc.orig
    if (getattr(original, "sqlstate", None) or getattr(original, "pgcode", None)) == "23505":
        return getattr(getattr(original, "diag", None), "constraint_name", None) in _DUPLICATE_CONSTRAINTS
    message = str(original)
    return message.startswith("UNIQUE constraint failed: ") and message.removeprefix(
        "UNIQUE constraint failed: "
    ) in _SQLITE_DUPLICATE_COLUMNS
