"""Create and load tournament registration rows."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.auth import get_application_role
from app.core.files import FileStorage, FileStorageError
from app.models import User
from app.tournaments.exceptions import (
    ParentalConsentFormNotAllowedError,
    ParentalConsentFormRequiredError,
    RegistrationConflictError,
    RegistrationNotAllowedError,
    RegistrationResourceNotFoundError,
)
from app.core.files.models import StoredFile
from app.tournaments.models import (
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from .registration_acceptances import CHOICE_FIELDS, create_acceptance
from . import tournament_local_dates
from .tournament_local_dates import is_minor_at_tournament_start
from .registration_numbers import (
    MAX_TOURNAMENT_REGISTRATION_NUMBER,
    format_tournament_registration_number,
)
from .registration_documents import (
    create_parental_consent_form_download_url,
    inspect_staged_parental_consent_form_upload,
    promote_staged_parental_consent_form_to_registration,
    validate_staged_parental_consent_form_storage_key,
    delete_storage_object_quietly,
)

if TYPE_CHECKING:
    from app.tournaments.schemas import RegistrationCreate

_DUPLICATE_CONSTRAINTS = {
    "uq_tournament_registrations_active_user",
    "uq_tournament_registrations_active_email",
    "uq_tournament_registrations_active_document",
}
_SQLITE_DUPLICATE_COLUMNS = (
    "tournament_registrations.tournament_id, tournament_registrations.user_id",
    "tournament_registrations.tournament_id, tournament_registrations.email_normalized",
    "tournament_registrations.tournament_id, tournament_registrations.identity_document_number_normalized",
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
        query = query.with_for_update(of=Tournament)
    tournament = session.scalar(query)
    if tournament is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    return tournament


def create_tournament_registration(
    session: Session,
    tournament_id: int,
    user: User,
    payload: RegistrationCreate,
    accepted_from_ip: str,
    *,
    file_storage: FileStorage | None = None,
) -> TournamentRegistration:
    """Create a tournament registration row, assign the next registration number, and commit."""

    email_normalized = normalize_tournament_registration_identity(payload.email)
    document_normalized = normalize_tournament_registration_identity(
        payload.identity_document_number
    )
    account_email_normalized = (
        normalize_tournament_registration_identity(user.email) if user.email else ""
    )
    email_parts = email_normalized.split("@")
    if len(email_parts) != 2 or not all(email_parts) or not document_normalized:
        raise RegistrationNotAllowedError("Invalid email or identity document")
    if email_normalized != account_email_normalized:
        raise RegistrationNotAllowedError("Registration email must match account email")

    tournament = visible_tournament(session, tournament_id, user, lock=True)
    today = tournament_local_dates.current_local_calendar_date()
    if (
        tournament.registration_opens_on is None
        or tournament.registration_closes_on is None
        or tournament.is_registration_closed
        or not tournament.registration_opens_on
        <= today
        <= tournament.registration_closes_on
    ):
        raise RegistrationNotAllowedError("Registration is closed")
    if not tournament.terms_version or not tournament.rules_version:
        raise RegistrationNotAllowedError("Registration terms are not configured")
    if tournament.next_registration_number > MAX_TOURNAMENT_REGISTRATION_NUMBER:
        raise RegistrationConflictError("Registration number capacity exhausted")

    staged_storage_key = payload.parental_consent_form_storage_key
    original_file_name = payload.parental_consent_form_original_file_name
    has_staged_parental_consent_form = staged_storage_key is not None

    is_minor = is_minor_at_tournament_start(payload.birth_date, tournament.starts_at)
    if is_minor and not has_staged_parental_consent_form:
        raise ParentalConsentFormRequiredError("Parental consent form is required")
    if not is_minor and has_staged_parental_consent_form:
        raise ParentalConsentFormNotAllowedError(
            "Parental consent form is not allowed for this registration"
        )
    if has_staged_parental_consent_form and file_storage is None:
        raise FileStorageError("File storage is not configured")

    if has_staged_parental_consent_form:
        validate_staged_parental_consent_form_storage_key(
            staged_storage_key, tournament.id, user.id
        )
        inspect_staged_parental_consent_form_upload(file_storage, staged_storage_key)

    acceptance = create_acceptance(tournament, user.id, payload, accepted_from_ip)
    serial = tournament.next_registration_number
    tournament.next_registration_number = serial + 1
    tournament_registration = TournamentRegistration(
        **payload.model_dump(
            exclude={
                *CHOICE_FIELDS,
                "acceptance_token",
                "acceptance_language",
                "parental_consent_form_storage_key",
                "parental_consent_form_original_file_name",
            }
        ),
        tournament_id=tournament.id,
        user_id=user.id,
        registration_number=format_tournament_registration_number(
            tournament.id, serial
        ),
        registration_status="awaiting_payment",
        email_normalized=email_normalized,
        identity_document_number_normalized=document_normalized,
    )
    tournament_registration.acceptances.append(acceptance)
    session.add(tournament_registration)
    final_storage_key: str | None = None
    try:
        session.flush()
        if has_staged_parental_consent_form:
            final_storage_key, content_type, size_bytes = (
                promote_staged_parental_consent_form_to_registration(
                    file_storage,
                    staged_storage_key=staged_storage_key,
                    tournament_id=tournament.id,
                    registration_id=tournament_registration.id,
                )
            )
            session.add(
                TournamentRegistrationDocument(
                    registration_id=tournament_registration.id,
                    document_type="parental_consent_form",
                    file=StoredFile(
                        storage_key=final_storage_key,
                        original_file_name=original_file_name
                        or "parental-consent-form",
                        content_type=content_type,
                        size_bytes=size_bytes,
                    ),
                )
            )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        if is_duplicate_tournament_registration(exc):
            raise RegistrationConflictError("Registration already exists") from exc
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
    session.refresh(tournament_registration)
    return tournament_registration


def read_tournament_registration_parental_consent_form_download(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int]:
    """Return a presigned download URL for the parental consent form when the caller may read it."""

    visible_tournament(session, tournament_id, user)
    tournament_registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
    )
    if tournament_registration is None or (
        tournament_registration.user_id != user.id
        and get_application_role(user) != "admin"
    ):
        raise RegistrationResourceNotFoundError("Registration not found")
    file_row = session.scalar(
        select(TournamentRegistrationDocument)
        .options(joinedload(TournamentRegistrationDocument.file))
        .where(
            TournamentRegistrationDocument.registration_id
            == tournament_registration.id,
            TournamentRegistrationDocument.document_type == "parental_consent_form",
        )
    )
    if file_row is None:
        raise RegistrationResourceNotFoundError("Parental consent form not found")
    return create_parental_consent_form_download_url(
        file_storage, file_row.file.storage_key
    )


def is_duplicate_tournament_registration(exc: IntegrityError) -> bool:
    """Return whether ``exc`` is a known active tournament registration uniqueness violation."""

    original = exc.orig
    if (
        getattr(original, "sqlstate", None) or getattr(original, "pgcode", None)
    ) == "23505":
        return (
            getattr(getattr(original, "diag", None), "constraint_name", None)
            in _DUPLICATE_CONSTRAINTS
        )
    message = str(original)
    return (
        message.startswith("UNIQUE constraint failed: ")
        and message.removeprefix("UNIQUE constraint failed: ")
        in _SQLITE_DUPLICATE_COLUMNS
    )
