"""Tournament configuration and payment-review routes requiring guild staff."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    require_admin,
)
from app.auth.models import User
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.services import tournament_policy_documents as policy_documents
from app.tournaments.schemas import PolicyDocumentPublish, PolicyDocumentRead, policy_document_read, PaymentProofUploadUrlRead
from app.tournaments.schemas import (
    AdditionalDocumentPublish,
    AdditionalDocumentRead,
    StaffRegistrationSummaryRead,
    StaffPaidWaitlistRead,
    PaidWaitlistConfirmationRead,
    TagInput,
    TagRead,
    TagSelection,
    RefundCompletionCreate,
    RefundCompletionRead,
    PaymentProofDownloadUrlRead,
    PaymentReviewDecisionCreate,
    PaymentReviewDecisionRead,
    StaffPaymentReviewDetail,
    StaffPaymentReviewQueue,
    StaffRegistrationRefundQueue,
    StaffTournamentList,
    StaffTournamentRead,
    TournamentCreate,
    TournamentRead,
    additional_document_read,
)
from app.tournaments.services import paid_waitlist, payment_proof_reviews, registration_cancellations, tournament_administration, tournament_registrations, tournament_tags
from app.tournaments.services.tournament_administration import (
    create_tournament_configuration,
)
from config import settings

router = APIRouter(prefix="/api/staff/tournaments")


@router.post("", response_model=TournamentRead, status_code=status.HTTP_201_CREATED)
def create_tournament(
    payload: TournamentCreate,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> TournamentRead:
    try:
        return create_tournament_configuration(
            session, payload, admin
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/payment-reviews", response_model=StaffPaymentReviewQueue)
def list_pending_payment_proofs(
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    registration_number: Annotated[
        str | None, Query(min_length=1, max_length=50)
    ] = None,
) -> StaffPaymentReviewQueue:
    return payment_proof_reviews.list_pending_payment_proofs(
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


@router.get("/refunds", response_model=StaffRegistrationRefundQueue)
def list_pending_registration_refunds(
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    registration_number: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
) -> StaffRegistrationRefundQueue:
    return registration_cancellations.list_pending_registration_refunds(
        session, admin, limit=limit, offset=offset, registration_number=registration_number
    )


@router.post("/{tournament_id}/registrations/{registration_number}/refund/complete")
def record_registration_refund_completion(
    tournament_id: int,
    registration_number: str,
    payload: RefundCompletionCreate,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> RefundCompletionRead:
    result = registration_cancellations.record_registration_refund_completion(
        session, tournament_id, registration_number, admin, payload.completed_at,
        accounts=request.app.state.account_email_reader,
        sender=request.app.state.mail_sender,
        application_base_url=str(settings.APP_BASE_URL) if settings.APP_BASE_URL else None,
        from_address=settings.SMTP_FROM,
    )
    return RefundCompletionRead(notification_result=result)


@router.get("", response_model=StaffTournamentList)
def list_staff_tournaments(
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> StaffTournamentList:
    return tournament_administration.list_staff_tournaments(
        session, admin, limit=limit, offset=offset
    )


@router.get("/{tournament_id}", response_model=StaffTournamentRead)
def get_staff_tournament(
    tournament_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> StaffTournamentRead:
    return tournament_administration.read_staff_tournament(
        session, admin, tournament_id
    )


@router.put("/{tournament_id}", response_model=StaffTournamentRead)
def update_staff_tournament(
    tournament_id: int,
    payload: TournamentCreate,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> StaffTournamentRead:
    try:
        return tournament_administration.update_tournament(
            session, admin, tournament_id, payload
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff_tournament(
    tournament_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    tournament_administration.delete_tournament(session, admin, tournament_id)


@router.get(
    "/{tournament_id}/registrations",
    response_model=list[StaffRegistrationSummaryRead],
)
def list_registrations(
    tournament_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_registrations.list_tournament_registrations_for_staff(session, tournament_id, admin)


@router.get("/{tournament_id}/waitlist", response_model=StaffPaidWaitlistRead)
def get_paid_waitlist(
    tournament_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return paid_waitlist.read_paid_waitlist(session, tournament_id, admin)


@router.post(
    "/{tournament_id}/registrations/{registration_number}/confirm",
    response_model=PaidWaitlistConfirmationRead,
)
def confirm_paid_waitlist_registration(
    tournament_id: int,
    registration_number: str,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return paid_waitlist.confirm_paid_waitlist_registration(session, tournament_id, registration_number, admin)


@router.post("/{tournament_id}/tags", response_model=TagRead, status_code=201)
def create_tag(
    tournament_id: int,
    payload: TagInput,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.save_tag(
        session, tournament_id, admin, payload.name, payload.eligibility_description
    )


@router.put("/{tournament_id}/tags/{tag_id}", response_model=TagRead)
def update_tag(
    tournament_id: int,
    tag_id: int,
    payload: TagInput,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.save_tag(
        session, tournament_id, admin, payload.name, payload.eligibility_description, tag_id
    )


@router.delete("/{tournament_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tournament_id: int,
    tag_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    tournament_tags.delete_tag(session, tournament_id, tag_id, admin)
    return Response(status_code=204)


@router.get("/{tournament_id}/registrations/{number}/tags", response_model=list[TagRead])
def get_staff_registration_tags(
    tournament_id: int,
    number: str,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.registration_tags(session, tournament_id, number, admin, staff=True)


@router.put("/{tournament_id}/registrations/{number}/tags", response_model=list[TagRead])
def set_staff_registration_tags(
    tournament_id: int,
    number: str,
    payload: TagSelection,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.registration_tags(session, tournament_id, number, admin, payload.tag_ids, staff=True)


@router.post("/{tournament_id}/policy-documents/{purpose}/upload-url", response_model=PaymentProofUploadUrlRead)
def create_policy_upload_url(
    tournament_id: int,
    purpose: policy_documents.PolicyPurpose,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
):
    return policy_documents.create_upload(session, storage, tournament_id, purpose, admin)


@router.post("/{tournament_id}/policy-documents/{purpose}", response_model=PolicyDocumentRead, status_code=201)
def publish_policy_document(
    tournament_id: int,
    purpose: policy_documents.PolicyPurpose,
    payload: PolicyDocumentPublish,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
):
    document = policy_documents.publish(session, storage, tournament_id, purpose, admin, payload.storage_key, payload.original_file_name)
    return policy_document_read(document)


@router.post("/{tournament_id}/documents/upload-url", response_model=PaymentProofUploadUrlRead)
def create_additional_document_upload_url(
    tournament_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
):
    return policy_documents.create_upload(session, storage, tournament_id, None, admin)


@router.post("/{tournament_id}/documents", response_model=AdditionalDocumentRead, status_code=201)
def publish_additional_document(
    tournament_id: int,
    payload: AdditionalDocumentPublish,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
):
    document = policy_documents.publish(
        session, storage, tournament_id, None, admin, payload.storage_key,
        payload.original_file_name, title=payload.title,
    )
    return additional_document_read(document)
