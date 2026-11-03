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
from app.core.services.storage import FileStorage, FileStorageError
from app.models import User
from app.tournaments.exceptions import ParentalTermNotAllowedError, ParentalTermRequiredError
from app.tournaments.models import Tournament, TournamentSignup, TournamentSignupFile
from . import tournament_local_dates
from .tournament_local_dates import is_minor_at_tournament_start
from .tournament_inscriptions import (
    MAX_TOURNAMENT_INSCRIPTION_SERIAL,
    format_tournament_inscription_number,
)
from .tournament_signup_files import (
    create_parental_term_download_url,
    inspect_staged_parental_term_upload,
    promote_staged_parental_term_to_signup,
    validate_staged_parental_term_storage_key,
    delete_storage_object_quietly,
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
    *,
    file_storage: FileStorage | None = None,
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

    staged_storage_key = payload.parental_term_storage_key
    original_file_name = payload.parental_term_original_file_name
    has_staged_parental_term = staged_storage_key is not None

    is_minor = is_minor_at_tournament_start(payload.birth_date, tournament.starts_at)
    if is_minor and not has_staged_parental_term:
        raise ParentalTermRequiredError()
    if not is_minor and has_staged_parental_term:
        raise ParentalTermNotAllowedError()
    if has_staged_parental_term and file_storage is None:
        raise FileStorageError("File storage is not configured")

    staged_content_type: str | None = None
    staged_size_bytes: int | None = None
    if has_staged_parental_term:
        validate_staged_parental_term_storage_key(staged_storage_key, tournament.id, user.id)
        staged_content_type, staged_size_bytes = inspect_staged_parental_term_upload(
            file_storage,
            staged_storage_key,
        )

    serial = tournament.next_inscription_serial
    tournament.next_inscription_serial = serial + 1
    tournament_signup = TournamentSignup(
        **payload.model_dump(
            exclude={"parental_term_storage_key", "parental_term_original_file_name"}
        ),
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
    session.add(tournament_signup)
    final_storage_key: str | None = None
    try:
        session.flush()
        if has_staged_parental_term:
            final_storage_key = promote_staged_parental_term_to_signup(
                file_storage,
                staged_storage_key=staged_storage_key,
                tournament_id=tournament.id,
                signup_id=tournament_signup.id,
            )
            session.add(
                TournamentSignupFile(
                    signup_id=tournament_signup.id,
                    kind="parental_term",
                    storage_key=final_storage_key,
                    original_file_name=original_file_name or "parental-term",
                    content_type=staged_content_type,
                    size_bytes=staged_size_bytes,
                )
            )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        if is_duplicate_tournament_signup(exc):
            raise HTTPException(status_code=409, detail="Registration already exists") from exc
        raise
    except FileStorageError:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        raise
    except Exception:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        raise
    session.refresh(tournament_signup)
    return tournament_signup


def read_tournament_signup_parental_term_download(
    session: Session,
    tournament_id: int,
    inscription_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int]:
    """Return a presigned download URL for the parental term when the caller may read it."""

    visible_tournament(session, tournament_id, user)
    tournament_signup = session.scalar(
        select(TournamentSignup).where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.inscription_number == inscription_number,
        )
    )
    if tournament_signup is None or (
        tournament_signup.user_id != user.id and get_application_role(user) != "admin"
    ):
        raise HTTPException(status_code=404, detail="Registration not found")
    file_row = session.scalar(
        select(TournamentSignupFile).where(
            TournamentSignupFile.signup_id == tournament_signup.id,
            TournamentSignupFile.kind == "parental_term",
        )
    )
    if file_row is None:
        raise HTTPException(status_code=404, detail="Parental term not found")
    return create_parental_term_download_url(file_storage, file_row.storage_key)


def is_duplicate_tournament_signup(exc: IntegrityError) -> bool:
    """Return whether ``exc`` is a known active tournament registration uniqueness violation."""

    original = exc.orig
    if (getattr(original, "sqlstate", None) or getattr(original, "pgcode", None)) == "23505":
        return getattr(getattr(original, "diag", None), "constraint_name", None) in _DUPLICATE_CONSTRAINTS
    message = str(original)
    return message.startswith("UNIQUE constraint failed: ") and message.removeprefix(
        "UNIQUE constraint failed: "
    ) in _SQLITE_DUPLICATE_COLUMNS
