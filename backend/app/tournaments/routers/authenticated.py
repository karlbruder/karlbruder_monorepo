"""Registration and document routes requiring a signed-in account."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth.dependencies import AuthenticatedUser, require_authenticated_user
from app.auth.supabase.roles import get_application_role
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.models import TournamentRegistration
from app.tournaments.schemas import (
    ParentalConsentFormDownloadUrlRead,
    ParentalConsentFormUploadUrlRead,
    ParentalConsentFormSubmitCreate,
    PaymentProofDownloadUrlRead,
    PaymentProofSubmitCreate,
    PaymentProofUploadUrlRead,
    RegistrationCreate,
    RegistrationPaymentInstructions,
    RegistrationRead,
    StaffRegistrationRead,
)
from app.tournaments.services import (
    create_registration_payment_proof_upload_url,
    create_tournament_registration,
    read_registration_payment_instructions,
    read_registration_payment_proof_download,
    read_tournament_registration_parental_consent_form_download,
    submit_registration_payment_proof,
    visible_tournament,
)
from app.tournaments.services.registration_acceptances import project_registration
from app.tournaments.services.tournament_registrations import (
    submit_registration_parental_consent_form,
)
from app.tournaments.services.registration_documents import (
    create_parental_consent_form_upload_url,
)

router = APIRouter(
    prefix="/api/tournaments", dependencies=[Depends(require_authenticated_user)]
)


@router.post(
    "/{tournament_id}/registrations/parental-consent-form/upload-url",
    response_model=ParentalConsentFormUploadUrlRead,
)
def issue_parental_consent_form_upload_url(
    tournament_id: int,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> ParentalConsentFormUploadUrlRead:
    visible_tournament(session, tournament_id, user)
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
    "/{tournament_id}/registrations",
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
    return project_registration(tournament_registration)


@router.get(
    "/{tournament_id}/registrations",
    response_model=list[RegistrationRead | StaffRegistrationRead],
)
def list_registrations(
    tournament_id: int,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> list[RegistrationRead | StaffRegistrationRead]:
    visible_tournament(session, tournament_id, user)
    query = (
        select(TournamentRegistration)
        .options(joinedload(TournamentRegistration.tournament), selectinload(TournamentRegistration.documents))
        .where(TournamentRegistration.tournament_id == tournament_id)
        .order_by(TournamentRegistration.id)
    )
    if get_application_role(user) != "admin":
        query = query.where(TournamentRegistration.user_id == user.id)
    registrations = session.scalars(query)
    if get_application_role(user) == "admin":
        return [
            project_registration(tournament_registration, staff=True)
            for tournament_registration in registrations
        ]
    return [
        project_registration(tournament_registration)
        for tournament_registration in registrations
    ]


@router.get(
    "/{tournament_id}/registrations/{registration_number}",
    response_model=RegistrationRead | StaffRegistrationRead,
)
def get_registration(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
) -> RegistrationRead | StaffRegistrationRead:
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
        raise HTTPException(status_code=404, detail="Registration not found")
    if get_application_role(user) == "admin":
        return project_registration(tournament_registration, staff=True)
    return project_registration(tournament_registration)


@router.post(
    "/{tournament_id}/registrations/{registration_number}/parental-consent-form",
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
    return project_registration(registration)


@router.get(
    "/{tournament_id}/registrations/{registration_number}/parental-consent-form",
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
    "/{tournament_id}/registrations/{registration_number}/payment",
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
    "/{tournament_id}/registrations/{registration_number}/payment-proof/upload-url",
    response_model=PaymentProofUploadUrlRead,
)
def create_payment_proof_upload_url_route(
    tournament_id: int,
    registration_number: str,
    user: AuthenticatedUser,
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> PaymentProofUploadUrlRead:
    storage_key, upload_url, expires_in_seconds, required_headers = (
        create_registration_payment_proof_upload_url(
            session,
            tournament_id,
            registration_number,
            user,
            file_storage,
        )
    )
    return PaymentProofUploadUrlRead(
        storage_key=storage_key,
        upload_url=upload_url,
        expires_in_seconds=expires_in_seconds,
        required_headers=required_headers,
    )


@router.post(
    "/{tournament_id}/registrations/{registration_number}/payment-proof",
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
    return project_registration(tournament_registration)


@router.get(
    "/{tournament_id}/registrations/{registration_number}/payment-proof",
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
