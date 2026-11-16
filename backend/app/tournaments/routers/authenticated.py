"""Registration and document routes requiring a signed-in account."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import AuthenticatedUser, require_authenticated_user
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.schemas import (
    PersonalRegistrationSummary,
    TagRead,
    TagSelection,
    ParentalConsentFormDownloadUrlRead,
    ParentalConsentFormUploadUrlRead,
    ParentalConsentFormSubmitCreate,
    PaymentProofDownloadUrlRead,
    PaymentProofSubmitCreate,
    PaymentProofUploadUrlRead,
    PaymentProofUploadUrlCreate,
    RegistrationCreate,
    RegistrationDetails,
    RegistrationPaymentInstructions,
    RegistrationRead,
    RegistrationRefundRead,
    StaffRegistrationRead,
)
from app.tournaments.services import (
    create_registration_payment_proof_upload_url,
    create_tournament_registration,
    read_registration_payment_instructions,
    read_registration_payment_proof_download,
    read_tournament_registration_parental_consent_form_download,
    submit_registration_payment_proof,
    load_visible_tournament,
)
from app.tournaments.services import registration_cancellations, tournament_tags
from app.tournaments.services.tournament_registrations import build_tournament_registration_read
from app.tournaments.services.tournament_registrations import (
    list_personal_registrations,
    list_tournament_registrations,
    read_tournament_registration,
    submit_registration_parental_consent_form,
    update_tournament_registration,
)
from app.tournaments.services.registration_documents import (
    create_parental_consent_form_upload_url,
)

router = APIRouter(
    prefix="/api", dependencies=[Depends(require_authenticated_user)]
)


@router.post(
    "/tournaments/{tournament_id}/registrations/parental-consent-form/upload-url",
    response_model=ParentalConsentFormUploadUrlRead,
)
def issue_parental_consent_form_upload_url(
    tournament_id: int,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> ParentalConsentFormUploadUrlRead:
    load_visible_tournament(session, tournament_id, user)
    storage_key, upload_url, expires_in_seconds, required_headers = (
        create_parental_consent_form_upload_url(
            file_storage,
            tournament_id,
            user,
        )
    )
    return ParentalConsentFormUploadUrlRead(
        storage_key=storage_key,
        upload_url=upload_url,
        expires_in_seconds=expires_in_seconds,
        required_headers=required_headers,
    )


@router.post(
    "/tournaments/{tournament_id}/registrations",
    response_model=RegistrationRead,
    status_code=status.HTTP_201_CREATED,
)
def register_for_tournament(
    tournament_id: int,
    payload: RegistrationCreate,
    request: Request,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> RegistrationRead:
    if request.client is None:
        raise HTTPException(status_code=503, detail="Client address unavailable")
    tournament_registration = create_tournament_registration(
        session,
        tournament_id,
        user,
        payload,
        request.client.host,
        file_storage=file_storage,
    )
    return build_tournament_registration_read(tournament_registration)


@router.get(
    "/tournaments/{tournament_id}/registrations",
    response_model=list[RegistrationRead | StaffRegistrationRead],
)
def list_registrations(
    tournament_id: int,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> list[RegistrationRead | StaffRegistrationRead]:
    return list_tournament_registrations(session, tournament_id, user)

@router.get(
    "/tournaments/{tournament_id}/registrations/{registration_number}",
    response_model=RegistrationRead | StaffRegistrationRead,
)
def get_registration(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> RegistrationRead | StaffRegistrationRead:
    return read_tournament_registration(session, tournament_id, registration_number, user)

@router.put(
    "/tournaments/{tournament_id}/registrations/{registration_number}",
    response_model=RegistrationRead,
)
def update_registration(
    tournament_id: int,
    registration_number: str,
    payload: RegistrationDetails,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> RegistrationRead:
    registration = update_tournament_registration(
        session, tournament_id, registration_number, user, payload
    )
    return build_tournament_registration_read(registration)


@router.post(
    "/tournaments/{tournament_id}/registrations/{registration_number}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
)
def cancel_registration(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    registration_cancellations.cancel_tournament_registration(
        session, tournament_id, registration_number, user
    )


@router.get(
    "/tournaments/{tournament_id}/registrations/{registration_number}/refund",
    response_model=RegistrationRefundRead | None,
)
def get_registration_refund(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> RegistrationRefundRead | None:
    refund = registration_cancellations.read_registration_refund(
        session, tournament_id, registration_number, user
    )
    return RegistrationRefundRead.model_validate(refund, from_attributes=True) if refund else None


@router.post(
    "/tournaments/{tournament_id}/registrations/{registration_number}/parental-consent-form",
    response_model=RegistrationRead,
)
def submit_parental_consent_form(
    tournament_id: int,
    registration_number: str,
    payload: ParentalConsentFormSubmitCreate,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> RegistrationRead:
    registration = submit_registration_parental_consent_form(
        session, tournament_id, registration_number, user,
        storage_key=payload.storage_key, original_file_name=payload.original_file_name,
        file_storage=file_storage,
    )
    return build_tournament_registration_read(registration)


@router.get(
    "/tournaments/{tournament_id}/registrations/{registration_number}/parental-consent-form",
    response_model=ParentalConsentFormDownloadUrlRead,
)
def get_parental_consent_form_download_url(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> ParentalConsentFormDownloadUrlRead:
    download_url, content_type, expires_in_seconds = (
        read_tournament_registration_parental_consent_form_download(
            session, tournament_id, registration_number, user, file_storage
        )
    )
    return ParentalConsentFormDownloadUrlRead(
        download_url=download_url,
        content_type=content_type,
        expires_in_seconds=expires_in_seconds,
    )


@router.get(
    "/tournaments/{tournament_id}/registrations/{registration_number}/payment",
    response_model=RegistrationPaymentInstructions,
)
def get_registration_payment_instructions(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> RegistrationPaymentInstructions:
    return read_registration_payment_instructions(
        session,
        tournament_id,
        registration_number,
        user,
    )


@router.post(
    "/tournaments/{tournament_id}/registrations/{registration_number}/payment-proof/upload-url",
    response_model=PaymentProofUploadUrlRead,
)
def create_payment_proof_upload_url_route(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    payload: PaymentProofUploadUrlCreate = PaymentProofUploadUrlCreate(),
) -> PaymentProofUploadUrlRead:
    storage_key, upload_url, expires_in_seconds, required_headers = (
        create_registration_payment_proof_upload_url(
            session,
            tournament_id,
            registration_number,
            user,
            file_storage,
            payload.original_file_name,
        )
    )
    return PaymentProofUploadUrlRead(
        storage_key=storage_key,
        upload_url=upload_url,
        expires_in_seconds=expires_in_seconds,
        required_headers=required_headers,
    )


@router.post(
    "/tournaments/{tournament_id}/registrations/{registration_number}/payment-proof",
    response_model=RegistrationRead,
)
def submit_payment_proof(
    tournament_id: int,
    registration_number: str,
    payload: PaymentProofSubmitCreate,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> RegistrationRead:
    tournament_registration = submit_registration_payment_proof(
        session,
        tournament_id,
        registration_number,
        user,
        storage_key=payload.storage_key,
        original_file_name=payload.original_file_name,
        file_storage=file_storage,
    )
    return build_tournament_registration_read(tournament_registration)


@router.get(
    "/tournaments/{tournament_id}/registrations/{registration_number}/payment-proof",
    response_model=PaymentProofDownloadUrlRead,
)
def get_payment_proof_download_url(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> PaymentProofDownloadUrlRead:
    download_url, content_type, expires_in_seconds = (
        read_registration_payment_proof_download(
            session,
            tournament_id,
            registration_number,
            user,
            file_storage,
        )
    )
    return PaymentProofDownloadUrlRead(
        download_url=download_url,
        content_type=content_type,
        expires_in_seconds=expires_in_seconds,
    )


@router.get("/tournaments/{tournament_id}/tags", response_model=list[TagRead])
def list_tags(
    tournament_id: int,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.list_tags(session, tournament_id, user)


@router.get("/tournaments/{tournament_id}/registrations/{number}/tags", response_model=list[TagRead])
def get_registration_tags(
    tournament_id: int,
    number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.registration_tags(session, tournament_id, number, user)


@router.put("/tournaments/{tournament_id}/registrations/{number}/tags", response_model=list[TagRead])
def set_registration_tags(
    tournament_id: int,
    number: str,
    payload: TagSelection,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
):
    return tournament_tags.registration_tags(session, tournament_id, number, user, payload.tag_ids)


@router.get("/tournaments/registrations", response_model=list[PersonalRegistrationSummary])
def list_my_registrations(
    user: AuthenticatedUser, session: Annotated[Session, Depends(get_session)]
):
    return list_personal_registrations(session, user)
