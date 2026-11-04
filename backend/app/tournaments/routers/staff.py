"""Tournament configuration and payment-review routes requiring guild staff."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    require_admin,
)
from app.auth.models import User
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.schemas import (
    PaymentProofDownloadUrlRead,
    PaymentReviewDecisionCreate,
    PaymentReviewDecisionRead,
    StaffPaymentReviewDetail,
    StaffPaymentReviewQueue,
    TournamentCreate,
    TournamentRead,
)
from app.tournaments.services import payment_proof_reviews
from app.tournaments.services.policy_fetch import PolicyFetcher, get_policy_fetcher
from app.tournaments.services.tournament_policies import (
    create_tournament_configuration,
)
from config import settings

router = APIRouter(prefix="/api/staff/tournaments")


@router.post("", response_model=TournamentRead, status_code=status.HTTP_201_CREATED)
def create_tournament(
    payload: TournamentCreate,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
    fetcher: Annotated[PolicyFetcher, Depends(get_policy_fetcher)],
) -> TournamentRead:
    try:
        return create_tournament_configuration(
            session, payload, admin, storage, fetcher
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/payment-reviews", response_model=StaffPaymentReviewQueue)
def list_payment_reviews(
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    registration_number: Annotated[
        str | None, Query(min_length=1, max_length=50)
    ] = None,
) -> StaffPaymentReviewQueue:
    return payment_proof_reviews.list_payment_reviews(
        session,
        admin,
        limit=limit,
        offset=offset,
        registration_number=registration_number,
    )


@router.get(
    "/payment-reviews/{registration_number}",
    response_model=StaffPaymentReviewDetail,
)
def get_payment_review(
    registration_number: str,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> StaffPaymentReviewDetail:
    return payment_proof_reviews.read_payment_review(
        session, admin, registration_number
    )


@router.get(
    "/payment-reviews/{registration_number}/documents/{document_id}/download-url",
    response_model=PaymentProofDownloadUrlRead,
)
def get_payment_review_document_download_url(
    registration_number: str,
    document_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> PaymentProofDownloadUrlRead:
    return payment_proof_reviews.read_payment_review_document(
        session, admin, registration_number, document_id, storage
    )


@router.post(
    "/payment-reviews/{registration_number}/decisions",
    response_model=PaymentReviewDecisionRead,
)
def record_payment_review_decision(
    registration_number: str,
    payload: PaymentReviewDecisionCreate,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> PaymentReviewDecisionRead:
    return payment_proof_reviews.record_payment_review_decision(
        session,
        admin,
        registration_number,
        payload,
        accounts=request.app.state.account_email_reader,
        sender=request.app.state.mail_sender,
        application_base_url=(
            str(settings.APP_BASE_URL) if settings.APP_BASE_URL else None
        ),
        from_address=settings.SMTP_FROM,
    )
