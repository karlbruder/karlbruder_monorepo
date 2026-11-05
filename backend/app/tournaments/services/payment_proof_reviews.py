"""Payment-review evidence and transactional registration decisions."""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth.account_email import AccountEmailReader
from app.core.mail import MailSender
from app.payments.services.records import add_payment_record
from app.tournaments.services.tournament_local_dates import is_minor_at_tournament_start
from app.tournaments.services.payment_review_notifications import (
    PaymentReviewNotice,
    send_payment_review_notice,
)
from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.auth.services import get_application_role
from app.core.files import FileStorage
from app.tournaments.exceptions import (
    RegistrationResourceNotFoundError,
    RegistrationConflictError,
    ParentalConsentFormRequiredError,
    TournamentError,
)
from app.tournaments.models import (
    PaymentProofReview,
    RegistrationPayment,
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.schemas import (
    PaymentReviewDecisionCreate,
    PaymentReviewDecisionRead,
    PaymentProofDownloadUrlRead,
    PaymentProofReviewRead,
    StaffPaymentReviewDetail,
    StaffPaymentReviewQueue,
    StaffPaymentReviewQueueItem,
    StaffReviewDocumentRead,
)
from app.tournaments.services.registration_acceptances import project_registration
from app.tournaments.services.registration_documents import (
    create_parental_consent_form_download_url,
    create_payment_proof_download_url,
)


def _require_admin(user: User) -> None:
    if get_application_role(user) != "admin":
        raise AdminAccessRequiredException()


def list_pending_payment_proofs(
    session: Session,
    user: User,
    *,
    limit: int = 20,
    offset: int = 0,
    registration_number: str | None = None,
) -> StaffPaymentReviewQueue:
    _require_admin(user)
    latest = (
        select(func.max(TournamentRegistrationDocument.id))
        .where(
            TournamentRegistrationDocument.registration_id == TournamentRegistration.id,
            TournamentRegistrationDocument.document_type == "payment_proof",
        )
        .correlate(TournamentRegistration)
        .scalar_subquery()
    )
    query = (
        select(
            TournamentRegistration.registration_number,
            TournamentRegistration.tournament_id,
            Tournament.name.label("tournament_name"),
            TournamentRegistration.full_name,
            TournamentRegistration.registration_status,
            TournamentRegistrationDocument.id.label("document_id"),
            TournamentRegistrationDocument.submitted_at,
        )
        .join(Tournament, Tournament.id == TournamentRegistration.tournament_id)
        .join(
            TournamentRegistrationDocument, TournamentRegistrationDocument.id == latest
        )
        .where(
            TournamentRegistration.registration_status == "awaiting_payment_confirmation",
            ~select(PaymentProofReview.id)
            .where(PaymentProofReview.document_id == TournamentRegistrationDocument.id)
            .exists(),
        )
    )
    if registration_number is not None:
        query = query.where(
            TournamentRegistration.registration_number == registration_number
        )
    total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = session.execute(
        query.order_by(TournamentRegistrationDocument.id).limit(limit).offset(offset)
    ).mappings()
    return StaffPaymentReviewQueue(
        items=[StaffPaymentReviewQueueItem(**row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


def read_payment_review(
    session: Session,
    user: User,
    registration_number: str,
) -> StaffPaymentReviewDetail:
    _require_admin(user)
    registration = session.scalar(
        select(TournamentRegistration)
        .where(TournamentRegistration.registration_number == registration_number)
        .options(
            joinedload(TournamentRegistration.tournament),
            selectinload(TournamentRegistration.acceptances),
            selectinload(TournamentRegistration.documents).joinedload(
                TournamentRegistrationDocument.file
            ),
        )
    )
    if registration is None:
        raise RegistrationResourceNotFoundError("Registration not found")
    tournament = registration.tournament
    documents = sorted(
        registration.documents, key=lambda document: document.id, reverse=True
    )
    proof_ids = [
        document.id
        for document in documents
        if document.document_type == "payment_proof"
    ]
    reviews = session.scalars(
        select(PaymentProofReview)
        .where(PaymentProofReview.document_id.in_(proof_ids))
        .order_by(PaymentProofReview.id)
    )
    confirmed_count = (
        session.scalar(
            select(func.count())
            .select_from(TournamentRegistration)
            .where(
                TournamentRegistration.tournament_id == tournament.id,
                TournamentRegistration.registration_status == "confirmed",
            )
        )
        or 0
    )
    return StaffPaymentReviewDetail(
        registration=project_registration(registration, staff=True),
        tournament_name=tournament.name,
        registration_fee_amount=tournament.registration_fee_amount,
        payment_due_at=tournament.payment_due_at,
        competitor_capacity=tournament.competitor_capacity,
        confirmed_count=confirmed_count,
        equipment_requirements=tournament.equipment_requirements,
        latest_document_id=proof_ids[0] if proof_ids else None,
        documents=[
            StaffReviewDocumentRead(
                id=document.id,
                document_type=document.document_type,
                original_file_name=document.file.original_file_name,
                content_type=document.file.content_type,
                size_bytes=document.file.size_bytes,
                submitted_at=document.submitted_at,
            )
            for document in documents
        ],
        reviews=[PaymentProofReviewRead.model_validate(review) for review in reviews],
    )


def read_payment_review_document(
    session: Session,
    user: User,
    registration_number: str,
    document_id: int,
    storage: FileStorage,
) -> PaymentProofDownloadUrlRead:
    _require_admin(user)
    document = session.scalar(
        select(TournamentRegistrationDocument)
        .join(TournamentRegistration)
        .options(joinedload(TournamentRegistrationDocument.file))
        .where(
            TournamentRegistration.registration_number == registration_number,
            TournamentRegistrationDocument.id == document_id,
            TournamentRegistrationDocument.document_type.in_(
                ["payment_proof", "parental_consent_form"]
            ),
        )
    )
    if document is None:
        raise RegistrationResourceNotFoundError("Document not found")
    download = (
        create_payment_proof_download_url
        if document.document_type == "payment_proof"
        else create_parental_consent_form_download_url
    )
    url, content_type, expires = download(storage, document.file.storage_key)
    return PaymentProofDownloadUrlRead(
        download_url=url,
        content_type=content_type,
        expires_in_seconds=expires,
    )


def _lock_registration_for_review(
    session: Session,
    registration_number: str,
) -> tuple[Tournament, TournamentRegistration]:
    tournament = session.scalar(
        select(Tournament)
        .join(TournamentRegistration)
        .where(TournamentRegistration.registration_number == registration_number)
        .with_for_update(of=Tournament)
        .execution_options(populate_existing=True)
    )
    if tournament is None:
        raise RegistrationResourceNotFoundError("Registration not found")
    registration = session.scalar(
        select(TournamentRegistration)
        .where(TournamentRegistration.registration_number == registration_number)
        .with_for_update(of=TournamentRegistration)
        .execution_options(populate_existing=True)
    )
    return tournament, registration


def _require_reviewable_proof(
    session: Session,
    registration: TournamentRegistration,
    document_id: int,
) -> None:
    latest_id = session.scalar(
        select(func.max(TournamentRegistrationDocument.id)).where(
            TournamentRegistrationDocument.registration_id == registration.id,
            TournamentRegistrationDocument.document_type == "payment_proof",
        )
    )
    reviewed = session.scalar(
        select(PaymentProofReview.id)
        .where(PaymentProofReview.document_id == document_id)
        .limit(1)
    )
    receipt = session.scalar(
        select(RegistrationPayment.id)
        .where(RegistrationPayment.registration_id == registration.id)
        .limit(1)
    )
    if (
        registration.registration_status != "awaiting_payment_confirmation"
        or latest_id != document_id
        or reviewed is not None
        or receipt is not None
    ):
        raise RegistrationConflictError("Payment proof is no longer reviewable")


def _approve_registration_payment(
    session: Session,
    tournament: Tournament,
    registration: TournamentRegistration,
    review: PaymentProofReview,
    amount_received: Decimal,
) -> None:
    if is_minor_at_tournament_start(registration.birth_date, tournament.starts_at):
        parental_form = session.scalar(
            select(TournamentRegistrationDocument.id)
            .where(
                TournamentRegistrationDocument.registration_id == registration.id,
                TournamentRegistrationDocument.document_type == "parental_consent_form",
            )
            .limit(1)
        )
        if parental_form is None:
            raise ParentalConsentFormRequiredError("Parental consent form required")
    payment = add_payment_record(
        session,
        amount_received=amount_received,
        verified_by_user_id=review.reviewed_by_user_id,
        verified_at=review.reviewed_at,
    )
    session.add(
        RegistrationPayment(
            registration_id=registration.id,
            proof_review_id=review.id,
            payment_id=payment.id,
        )
    )
    confirmed = (
        session.scalar(
            select(func.count())
            .select_from(TournamentRegistration)
            .where(
                TournamentRegistration.tournament_id == tournament.id,
                TournamentRegistration.registration_status == "confirmed",
            )
        )
        or 0
    )
    registration.registration_status = (
        "confirmed"
        if tournament.competitor_capacity is None
        or confirmed < tournament.competitor_capacity
        else "waitlist"
    )


def record_payment_review_decision(
    session: Session,
    user: User,
    registration_number: str,
    payload: PaymentReviewDecisionCreate,
    *,
    accounts: AccountEmailReader,
    sender: MailSender,
    application_base_url: str | None,
    from_address: str,
) -> PaymentReviewDecisionRead:
    """Save the staff decision atomically, then attempt its required notice."""
    _require_admin(user)
    notice = None
    try:
        tournament, registration = _lock_registration_for_review(
            session, registration_number
        )
        _require_reviewable_proof(session, registration, payload.document_id)
        review = PaymentProofReview(
            document_id=payload.document_id,
            decision=payload.decision,
            rejection_reason=payload.rejection_reason,
            reviewed_by_user_id=user.id,
            reviewed_at=datetime.now(UTC),
        )
        session.add(review)
        session.flush()
        if payload.decision == "approved":
            _approve_registration_payment(
                session, tournament, registration, review, payload.amount_received
            )
        else:
            registration.registration_status = "awaiting_payment"
        response = PaymentReviewDecisionRead(
            review=PaymentProofReviewRead.model_validate(review),
            registration_status=registration.registration_status,
            notification_result="not_required",
        )
        if (
            payload.decision == "rejected"
            or registration.registration_status == "waitlist"
        ):
            notice = PaymentReviewNotice(
                review_id=review.id,
                user_id=registration.user_id,
                tournament_id=tournament.id,
                registration_number=registration.registration_number,
                outcome="rejected" if payload.decision == "rejected" else "waitlist",
                rejection_reason=payload.rejection_reason,
            )
        session.commit()
    except (SQLAlchemyError, TournamentError):
        session.rollback()
        raise
    if notice is not None:
        response.notification_result = send_payment_review_notice(
            notice,
            accounts=accounts,
            sender=sender,
            application_base_url=application_base_url,
            from_address=from_address,
        )
    return response
