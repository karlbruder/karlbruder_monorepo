"""Owner payment instructions and payment proof uploads for a tournament registration."""

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.files import FileStorage, FileStorageError
from app.tournaments.exceptions import (
    RegistrationConflictError,
    RegistrationDocumentInvalidError,
    RegistrationResourceNotFoundError,
    TournamentError,
)
from app.auth.models import User
from app.tournaments.services.tournament_payment_settings import (
    read_registration_pix_key_for_tournament,
)
from app.core.files.models import StoredFile
from app.tournaments.models import (
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.services.registration_documents import (
    create_payment_proof_download_url,
    create_payment_proof_upload_url,
    delete_storage_object_quietly,
    inspect_staged_payment_proof_upload,
    promote_staged_payment_proof_to_registration,
    validate_staged_payment_proof_storage_key,
)
from app.tournaments.services.tournament_registrations import visible_tournament

_PAYMENT_PROOF_UPLOAD_STATUSES = frozenset({"awaiting_payment", "payment_in_review"})


def load_owner_tournament_registration(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
) -> TournamentRegistration:
    visible_tournament(session, tournament_id, user)
    tournament_registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
    )
    if tournament_registration is None or tournament_registration.user_id != user.id:
        raise RegistrationResourceNotFoundError("Registration not found")
    return tournament_registration


def create_registration_payment_proof_upload_url(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int, dict[str, str]]:
    tournament_registration = load_owner_tournament_registration(
        session, tournament_id, registration_number, user
    )
    if (
        tournament_registration.registration_status
        not in _PAYMENT_PROOF_UPLOAD_STATUSES
    ):
        raise RegistrationConflictError(
            "Payment proof cannot be submitted for this registration status"
        )
    return create_payment_proof_upload_url(file_storage, tournament_id, user)


def submit_registration_payment_proof(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    *,
    storage_key: str,
    original_file_name: str,
    file_storage: FileStorage,
) -> TournamentRegistration:
    visible_tournament(session, tournament_id, user)
    tournament_registration = session.scalar(
        select(TournamentRegistration)
        .where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
        .with_for_update()
    )
    if tournament_registration is None or tournament_registration.user_id != user.id:
        raise RegistrationResourceNotFoundError("Registration not found")
    if (
        tournament_registration.registration_status
        not in _PAYMENT_PROOF_UPLOAD_STATUSES
    ):
        raise RegistrationConflictError(
            "Payment proof cannot be submitted for this registration status"
        )
    normalized_file_name = original_file_name.strip()
    if not normalized_file_name:
        raise RegistrationDocumentInvalidError(
            "Payment proof original file name is required"
        )

    validate_staged_payment_proof_storage_key(storage_key, tournament_id, user.id)
    inspect_staged_payment_proof_upload(file_storage, storage_key)

    final_storage_key: str | None = None
    try:
        final_storage_key, content_type, size_bytes = (
            promote_staged_payment_proof_to_registration(
                file_storage,
                staged_storage_key=storage_key,
                tournament_id=tournament_id,
                registration_id=tournament_registration.id,
            )
        )
        session.add(
            TournamentRegistrationDocument(
                registration_id=tournament_registration.id,
                document_type="payment_proof",
                file=StoredFile(
                    storage_key=final_storage_key,
                    original_file_name=normalized_file_name,
                    content_type=content_type,
                    size_bytes=size_bytes,
                ),
            )
        )
        if tournament_registration.registration_status == "awaiting_payment":
            tournament_registration.registration_status = "payment_in_review"
        session.commit()
    except (FileStorageError, TournamentError, SQLAlchemyError):
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        raise

    session.refresh(tournament_registration)
    return tournament_registration


def read_registration_payment_proof_download(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int]:
    tournament_registration = load_owner_tournament_registration(
        session, tournament_id, registration_number, user
    )
    latest_proof_row = session.scalar(
        select(TournamentRegistrationDocument)
        .options(joinedload(TournamentRegistrationDocument.file))
        .where(
            TournamentRegistrationDocument.registration_id
            == tournament_registration.id,
            TournamentRegistrationDocument.document_type == "payment_proof",
        )
        .order_by(TournamentRegistrationDocument.id.desc())
        .limit(1)
    )
    if latest_proof_row is None:
        raise RegistrationResourceNotFoundError("Payment proof not found")
    return create_payment_proof_download_url(
        file_storage, latest_proof_row.file.storage_key
    )


def read_registration_payment_instructions(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
):
    """Return payment instructions for the tournament registration owner only."""

    from app.tournaments.schemas import (
        PixPaymentOptionRead,
        RegistrationPaymentInstructions,
        RegistrationPaymentOptions,
        RegistrationPaymentProofSummary,
    )

    visible_tournament(session, tournament_id, user)
    tournament_registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
    )
    if tournament_registration is None or tournament_registration.user_id != user.id:
        raise RegistrationResourceNotFoundError("Registration not found")
    tournament = session.scalar(
        select(Tournament).where(Tournament.id == tournament_id)
    )
    if tournament is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    latest_proof_row = session.scalar(
        select(TournamentRegistrationDocument)
        .options(joinedload(TournamentRegistrationDocument.file))
        .where(
            TournamentRegistrationDocument.registration_id
            == tournament_registration.id,
            TournamentRegistrationDocument.document_type == "payment_proof",
        )
        .order_by(TournamentRegistrationDocument.id.desc())
        .limit(1)
    )
    latest_payment_proof = None
    if latest_proof_row is not None:
        latest_payment_proof = RegistrationPaymentProofSummary(
            original_file_name=latest_proof_row.file.original_file_name,
            content_type=latest_proof_row.file.content_type,
            size_bytes=latest_proof_row.file.size_bytes,
            submitted_at=latest_proof_row.submitted_at,
        )
    registration_pix_key = read_registration_pix_key_for_tournament(
        session, tournament_id
    )
    return RegistrationPaymentInstructions(
        registration_number=tournament_registration.registration_number,
        registration_status=tournament_registration.registration_status,
        registration_fee_amount=tournament.registration_fee_amount,
        payment_due_at=tournament.payment_due_at,
        payment_options=RegistrationPaymentOptions(
            pix=PixPaymentOptionRead(pix_key=registration_pix_key),
        ),
        latest_payment_proof=latest_payment_proof,
    )
