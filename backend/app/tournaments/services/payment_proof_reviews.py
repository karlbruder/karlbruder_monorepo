"""Global staff access to payment-review work and private evidence."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.auth.services import get_application_role
from app.core.files import FileStorage
from app.tournaments.exceptions import RegistrationResourceNotFoundError
from app.tournaments.models import (
    PaymentProofReview,
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.schemas import (
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


def list_payment_reviews(
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
            TournamentRegistration.registration_status == "payment_in_review",
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
