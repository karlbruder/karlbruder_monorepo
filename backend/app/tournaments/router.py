"""Tournament catalog routes with server-side guest/member/admin boundaries."""

from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    get_application_role,
    get_current_user,
    require_admin,
    require_authenticated_user,
)
from app.core.files import FileStorage, get_file_storage
from app.database import get_session
from app.models import AnonymousUser, User
from app.tournaments.models import Tournament, TournamentRegistration
from app.tournaments.schemas import (
    ParentalConsentFormDownloadUrlRead,
    ParentalConsentFormUploadUrlRead,
    PaymentProofDownloadUrlRead,
    PaymentProofSubmitCreate,
    PaymentProofUploadUrlRead,
    RegistrationCreate,
    RegistrationPaymentInstructions,
    RegistrationRead,
    StaffRegistrationRead,
    TournamentCreate,
    TournamentList,
    TournamentRead,
)
from app.tournaments.services import (
    TOURNAMENT_LOCAL_TIMEZONE,
    create_tournament_registration,
    create_registration_payment_proof_upload_url,
    read_tournament_registration_parental_consent_form_download,
    read_registration_payment_instructions,
    read_registration_payment_proof_download,
    resolve_tournament_slug,
    submit_registration_payment_proof,
    visible_tournament,
)
from app.payments.services.tournament_payment_settings import (
    create_tournament_payment_settings,
)
from app.tournaments.services.registration_documents import (
    create_parental_consent_form_upload_url,
)

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


def _can_view_internal(user: User | AnonymousUser) -> bool:
    return get_application_role(user) in ("guild_member", "admin")


@router.post("", response_model=TournamentRead, status_code=status.HTTP_201_CREATED)
def create_tournament(
    payload: TournamentCreate,
    _admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> Tournament:
    try:
        slug = resolve_tournament_slug(
            payload.name, payload.discipline, payload.starts_at, payload.slug
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if session.scalar(select(Tournament.id).where(Tournament.slug == slug)) is not None:
        raise HTTPException(status_code=409, detail="Tournament slug already exists")
    tournament_payload = payload.model_dump(exclude={"pix_key"})
    tournament = Tournament(**{**tournament_payload, "slug": slug})
    session.add(tournament)
    session.flush()
    create_tournament_payment_settings(
        session,
        tournament.id,
        payload.pix_key,
    )
    session.commit()
    session.refresh(tournament)
    return tournament


def _catalog_filters(
    user: User | AnonymousUser,
    name: str | None,
    starts_from: date | None,
    starts_to: date | None,
):
    if starts_from is not None and starts_to is not None and starts_to < starts_from:
        raise HTTPException(
            status_code=422, detail="starts_to must not precede starts_from"
        )
    query = select(Tournament)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    if name is not None:
        escaped = name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(Tournament.name.ilike(f"%{escaped}%", escape="\\"))
    if starts_from is not None:
        query = query.where(
            Tournament.starts_at
            >= datetime.combine(starts_from, time.min, TOURNAMENT_LOCAL_TIMEZONE)
        )
    if starts_to is not None:
        query = query.where(
            Tournament.starts_at
            < datetime.combine(
                starts_to + timedelta(days=1), time.min, TOURNAMENT_LOCAL_TIMEZONE
            )
        )
    return query


@router.get("", response_model=TournamentList)
def list_tournaments(
    user: Annotated[User | AnonymousUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    name: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    starts_from: date | None = None,
    starts_to: date | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TournamentList:
    filtered = _catalog_filters(user, name, starts_from, starts_to)
    total = session.scalar(select(func.count()).select_from(filtered.subquery())) or 0
    items = list(
        session.scalars(
            filtered.order_by(Tournament.starts_at, Tournament.id)
            .limit(limit)
            .offset(offset)
        )
    )
    return TournamentList(items=items, total=total, limit=limit, offset=offset)


@router.get("/{tournament_id}", response_model=TournamentRead)
def get_tournament(
    tournament_id: int,
    user: Annotated[User | AnonymousUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Tournament:
    query = select(Tournament).where(Tournament.id == tournament_id)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    tournament = session.scalar(query)
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@router.post(
    "/{tournament_id}/registrations/parental-consent-form/upload-url",
    response_model=ParentalConsentFormUploadUrlRead,
)
def issue_parental_consent_form_upload_url(
    tournament_id: int,
    user: Annotated[User, Depends(require_authenticated_user)],
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
    user: Annotated[User, Depends(require_authenticated_user)],
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
    return RegistrationRead.model_validate(tournament_registration)


@router.get(
    "/{tournament_id}/registrations",
    response_model=list[RegistrationRead | StaffRegistrationRead],
)
def list_registrations(
    tournament_id: int,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[RegistrationRead | StaffRegistrationRead]:
    visible_tournament(session, tournament_id, user)
    query = (
        select(TournamentRegistration)
        .where(TournamentRegistration.tournament_id == tournament_id)
        .order_by(TournamentRegistration.id)
    )
    if get_application_role(user) != "admin":
        query = query.where(TournamentRegistration.user_id == user.id)
    registrations = session.scalars(query)
    if get_application_role(user) == "admin":
        return [
            StaffRegistrationRead.model_validate(tournament_registration)
            for tournament_registration in registrations
        ]
    return [
        RegistrationRead.model_validate(tournament_registration)
        for tournament_registration in registrations
    ]


@router.get(
    "/{tournament_id}/registrations/{registration_number}",
    response_model=RegistrationRead | StaffRegistrationRead,
)
def get_registration(
    tournament_id: int,
    registration_number: str,
    user: Annotated[User, Depends(require_authenticated_user)],
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
        return StaffRegistrationRead.model_validate(tournament_registration)
    return RegistrationRead.model_validate(tournament_registration)


@router.get(
    "/{tournament_id}/registrations/{registration_number}/parental-consent-form",
    response_model=ParentalConsentFormDownloadUrlRead,
)
def get_parental_consent_form_download_url(
    tournament_id: int,
    registration_number: str,
    user: Annotated[User, Depends(require_authenticated_user)],
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
    user: Annotated[User, Depends(require_authenticated_user)],
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
    user: Annotated[User, Depends(require_authenticated_user)],
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
    user: Annotated[User, Depends(require_authenticated_user)],
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
    return RegistrationRead.model_validate(tournament_registration)


@router.get(
    "/{tournament_id}/registrations/{registration_number}/payment-proof",
    response_model=PaymentProofDownloadUrlRead,
)
def get_payment_proof_download_url(
    tournament_id: int,
    registration_number: str,
    user: Annotated[User, Depends(require_authenticated_user)],
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
