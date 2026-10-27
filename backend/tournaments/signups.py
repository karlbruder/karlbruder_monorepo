"""Transactional signup creation and narrow database-conflict translation."""

import re
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import get_application_role
from models import User
from tournaments.inscriptions import MAX_SERIAL, format_inscription_number
from tournaments.models import Tournament, TournamentSignup
from tournaments.schemas import SignupCreate

REGISTRATION_TIMEZONE = timezone(timedelta(hours=-3))
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


def normalize_identity(value: str) -> str:
    """REG-012 comparison value; never use this as a deliverable email address."""

    return re.sub(r"[\s.\-]", "", value).lower()


def registration_date(now: datetime | None = None) -> date:
    """Use fixed UTC-03:00 calendar days, independent of server timezone."""

    return (now or datetime.now(timezone.utc)).astimezone(REGISTRATION_TIMEZONE).date()


def visible_tournament(
    session: Session, tournament_id: int, user: User, *, lock: bool = False
) -> Tournament:
    query = select(Tournament).where(Tournament.id == tournament_id)
    if get_application_role(user) not in ("guild_member", "admin"):
        query = query.where(Tournament.is_internal.is_(False))
    if lock:
        query = query.with_for_update()
    tournament = session.scalar(query)
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


def is_duplicate_signup(exc: IntegrityError) -> bool:
    original = exc.orig
    if (getattr(original, "sqlstate", None) or getattr(original, "pgcode", None)) == "23505":
        return getattr(getattr(original, "diag", None), "constraint_name", None) in _DUPLICATE_CONSTRAINTS
    message = str(original)
    return message.startswith("UNIQUE constraint failed: ") and message.removeprefix(
        "UNIQUE constraint failed: "
    ) in _SQLITE_DUPLICATE_COLUMNS


def create_signup(
    session: Session,
    tournament_id: int,
    user: User,
    payload: SignupCreate,
    acceptance_ip: str,
) -> TournamentSignup:
    email_normalized = normalize_identity(payload.email)
    document_normalized = normalize_identity(payload.document_id)
    account_email_normalized = normalize_identity(user.email) if user.email else ""
    email_parts = email_normalized.split("@")
    if len(email_parts) != 2 or not all(email_parts) or not document_normalized:
        raise HTTPException(status_code=400, detail="Invalid email or identity document")
    if email_normalized != account_email_normalized:
        raise HTTPException(status_code=400, detail="Registration email must match account email")

    tournament = visible_tournament(session, tournament_id, user, lock=True)
    today = registration_date()
    if (
        tournament.registration_opens_on is None
        or tournament.registration_closes_on is None
        or tournament.new_registrations_closed
        or not tournament.registration_opens_on <= today <= tournament.registration_closes_on
    ):
        raise HTTPException(status_code=400, detail="Registration is closed")
    if not tournament.terms_version or not tournament.regulation_version:
        raise HTTPException(status_code=400, detail="Registration terms are not configured")
    if tournament.next_inscription_serial > MAX_SERIAL:
        raise HTTPException(status_code=409, detail="Inscription number capacity exhausted")

    serial = tournament.next_inscription_serial
    tournament.next_inscription_serial = serial + 1
    signup = TournamentSignup(
        **payload.model_dump(),
        tournament_id=tournament.id,
        user_id=user.id,
        inscription_number=format_inscription_number(tournament.id, serial),
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
        if is_duplicate_signup(exc):
            raise HTTPException(status_code=409, detail="Registration already exists") from exc
        raise
    session.refresh(signup)
    return signup
