"""Admin-only payment review evidence endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.models import User
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.schemas import (
    PaymentProofDownloadUrlRead,
    StaffPaymentReviewDetail,
    StaffPaymentReviewQueue,
)
from app.tournaments.services.payment_proof_reviews import (
    list_payment_reviews,
    read_payment_review,
    read_payment_review_document,
)

router = APIRouter(prefix="/staff/payment-reviews")


@router.get("", response_model=StaffPaymentReviewQueue)
def list_reviews(
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    registration_number: Annotated[
        str | None, Query(min_length=1, max_length=50)
    ] = None,
) -> StaffPaymentReviewQueue:
    return list_payment_reviews(
        session,
        admin,
        limit=limit,
        offset=offset,
        registration_number=registration_number,
    )


@router.get("/{registration_number}", response_model=StaffPaymentReviewDetail)
def read_review(
    registration_number: str,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> StaffPaymentReviewDetail:
    return read_payment_review(session, admin, registration_number)


@router.get(
    "/{registration_number}/documents/{document_id}/download-url",
    response_model=PaymentProofDownloadUrlRead,
)
def download_document(
    registration_number: str,
    document_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> PaymentProofDownloadUrlRead:
    return read_payment_review_document(
        session, admin, registration_number, document_id, storage
    )
