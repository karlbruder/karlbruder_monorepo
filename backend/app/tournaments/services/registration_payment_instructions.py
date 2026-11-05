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
    ParentalConsentFormNotAllowedError,
)
from app.auth.models import User
from app.core.files.models import StoredFile
from app.payments.models import Payment
from app.tournaments.models import (
    PaymentProofReview,
    RegistrationPayment,
    Tournament,
    TournamentPaymentSettings,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.services.registration_documents import (
    inspect_staged_parental_consent_form_upload,
    promote_staged_parental_consent_form_to_registration,
    validate_staged_parental_consent_form_storage_key,
    create_payment_proof_download_url,
    create_payment_proof_upload_url,
    delete_storage_object_quietly,
    inspect_staged_payment_proof_upload,
    promote_staged_payment_proof_to_registration,
    validate_staged_payment_proof_storage_key,
)
from app.tournaments.services.tournament_registrations import visible_tournament
from app.tournaments.services.tournament_local_dates import is_minor_at_tournament_start

_PAYMENT_PROOF_UPLOAD_STATUSES = frozenset({"awaiting_payment", "awaiting_payment_confirmation"})


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
        .execution_options(populate_existing=True)
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
            tournament_registration.registration_status = "awaiting_payment_confirmation"
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
        CurrentPaymentProofReview,
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
    payment_configuration = session.execute(
        select(
            Tournament.registration_fee_amount,
            Tournament.payment_due_at,
            Tournament.starts_at,
            TournamentPaymentSettings.pix_key,
        )
        .outerjoin(
            TournamentPaymentSettings,
            TournamentPaymentSettings.tournament_id == Tournament.id,
        )
        .where(Tournament.id == tournament_id)
    ).one_or_none()
    if payment_configuration is None:
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
    review = None
    if latest_proof_row is not None:
        review = session.scalar(
            select(PaymentProofReview)
            .where(PaymentProofReview.document_id == latest_proof_row.id)
            .order_by(PaymentProofReview.id.desc())
            .limit(1)
        )
    amount_received = None
    if review is not None and review.decision == "approved":
        amount_received = session.scalar(
            select(Payment.amount_received)
            .join(RegistrationPayment, RegistrationPayment.payment_id == Payment.id)
            .where(
                RegistrationPayment.registration_id == tournament_registration.id,
                RegistrationPayment.proof_review_id == review.id,
            )
        )
    parental_form_exists = session.scalar(
        select(TournamentRegistrationDocument.id).where(
            TournamentRegistrationDocument.registration_id == tournament_registration.id,
            TournamentRegistrationDocument.document_type == "parental_consent_form",
        ).limit(1)
    ) is not None
    parental_consent_required = (
        tournament_registration.registration_status != "cancelled"
        and is_minor_at_tournament_start(
            tournament_registration.birth_date, payment_configuration.starts_at
        )
        and not parental_form_exists
    )
    return RegistrationPaymentInstructions(
        registration_number=tournament_registration.registration_number,
        registration_status=tournament_registration.registration_status,
        parental_consent_required=parental_consent_required,
        registration_fee_amount=payment_configuration.registration_fee_amount,
        amount_received=amount_received,
        payment_due_at=payment_configuration.payment_due_at,
        payment_options=RegistrationPaymentOptions(
            pix=PixPaymentOptionRead(pix_key=payment_configuration.pix_key),
        ),
        latest_payment_proof=latest_payment_proof,
        current_review=(
            CurrentPaymentProofReview(
                document_id=review.document_id,
                decision=review.decision,
                rejection_reason=review.rejection_reason,
                reviewed_at=review.reviewed_at,
            )
            if review
            else None
        ),
    )


def submit_registration_parental_consent_form(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    *,
    storage_key: str,
    original_file_name: str,
    file_storage: FileStorage,
) -> TournamentRegistration:
    """Attach missing consent to an existing minor's own active registration."""
    final_key = None
    try:
        tournament = visible_tournament(session, tournament_id, user, lock=True)
        registration = session.scalar(
            select(TournamentRegistration)
            .where(
                TournamentRegistration.tournament_id == tournament_id,
                TournamentRegistration.registration_number == registration_number,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if registration is None or registration.user_id != user.id:
            raise RegistrationResourceNotFoundError("Registration not found")
        if registration.registration_status == "cancelled" or not is_minor_at_tournament_start(
            registration.birth_date, tournament.starts_at
        ):
            raise ParentalConsentFormNotAllowedError("Parental consent form is not required")
        existing = session.scalar(
            select(TournamentRegistrationDocument.id).where(
                TournamentRegistrationDocument.registration_id == registration.id,
                TournamentRegistrationDocument.document_type == "parental_consent_form",
            ).limit(1)
        )
        if existing is not None:
            raise RegistrationConflictError("Parental consent form already exists")
        name = original_file_name.strip()
        if not name:
            raise RegistrationDocumentInvalidError("Parental consent form file name is required")
        validate_staged_parental_consent_form_storage_key(storage_key, tournament_id, user.id)
        inspect_staged_parental_consent_form_upload(file_storage, storage_key)
        final_key, content_type, size = promote_staged_parental_consent_form_to_registration(
            file_storage, staged_storage_key=storage_key,
            tournament_id=tournament_id, registration_id=registration.id,
        )
        session.add(TournamentRegistrationDocument(
            registration_id=registration.id,
            document_type="parental_consent_form",
            file=StoredFile(storage_key=final_key, original_file_name=name,
                            content_type=content_type, size_bytes=size),
        ))
        session.commit()
        return registration
    except Exception:
        session.rollback()
        if final_key is not None:
            delete_storage_object_quietly(file_storage, final_key)
        raise
