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
from app.core.services.storage import FileStorage, FileStorageError, get_file_storage
from app.database import get_session
from app.models import AnonymousUser, User
from app.tournaments.exceptions import ParentalTermNotAllowedError, ParentalTermRequiredError
from app.tournaments.models import Tournament, TournamentSignup
from app.tournaments.schemas import (
    ParentalTermDownloadUrlRead,
    ParentalTermUploadUrlRead,
    SignupCreate,
    TournamentSignupPaymentInstructionsRead,
    SignupRead,
    StaffSignupRead,
    TournamentCreate,
    TournamentList,
    TournamentRead,
)
from app.tournaments.services import (
    TOURNAMENT_LOCAL_TIMEZONE,
    create_tournament_signup,
    read_tournament_signup_parental_term_download,
    read_tournament_signup_payment_instructions,
    resolve_tournament_slug,
    visible_tournament,
)
from app.payments.services.tournament_inscription_payment import (
    create_tournament_inscription_payment_config,
)
from app.tournaments.services.tournament_signup_files import create_parental_term_upload_url

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
            payload.name, payload.modality, payload.starts_at, payload.slug
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if session.scalar(select(Tournament.id).where(Tournament.slug == slug)) is not None:
        raise HTTPException(status_code=409, detail="Tournament slug already exists")
    tournament_payload = payload.model_dump(exclude={"pix_key"})
    tournament = Tournament(**{**tournament_payload, "slug": slug})
    session.add(tournament)
    session.flush()
    create_tournament_inscription_payment_config(
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
        raise HTTPException(status_code=422, detail="starts_to must not precede starts_from")
    query = select(Tournament)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    if name is not None:
        escaped = name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(Tournament.name.ilike(f"%{escaped}%", escape="\\"))
    if starts_from is not None:
        query = query.where(
            Tournament.starts_at >= datetime.combine(starts_from, time.min, TOURNAMENT_LOCAL_TIMEZONE)
        )
    if starts_to is not None:
        query = query.where(
            Tournament.starts_at
            < datetime.combine(starts_to + timedelta(days=1), time.min, TOURNAMENT_LOCAL_TIMEZONE)
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
            filtered.order_by(Tournament.starts_at, Tournament.id).limit(limit).offset(offset)
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
    "/{tournament_id}/signups/parental-term/upload-url",
    response_model=ParentalTermUploadUrlRead,
)
def issue_parental_term_upload_url(
    tournament_id: int,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> ParentalTermUploadUrlRead:
    visible_tournament(session, tournament_id, user)
    storage_key, upload_url, expires_in_seconds, required_headers = create_parental_term_upload_url(
        file_storage,
        tournament_id,
        user,
    )
    return ParentalTermUploadUrlRead(
        storage_key=storage_key,
        upload_url=upload_url,
        expires_in_seconds=expires_in_seconds,
        required_headers=required_headers,
    )


@router.post(
    "/{tournament_id}/signups", response_model=SignupRead, status_code=status.HTTP_201_CREATED
)
def register_for_tournament(
    tournament_id: int,
    payload: SignupCreate,
    request: Request,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> SignupRead:
    if request.client is None:
        raise HTTPException(status_code=503, detail="Client address unavailable")
    try:
        tournament_signup = create_tournament_signup(
            session,
            tournament_id,
            user,
            payload,
            request.client.host,
            file_storage=file_storage,
        )
    except ParentalTermRequiredError as error:
        raise HTTPException(status_code=422, detail="Parental term is required") from error
    except ParentalTermNotAllowedError as error:
        raise HTTPException(
            status_code=422, detail="Parental term is not allowed for this registration"
        ) from error
    except FileStorageError as error:
        raise HTTPException(status_code=503, detail="File storage unavailable") from error
    return SignupRead.model_validate(tournament_signup)


@router.get("/{tournament_id}/signups", response_model=list[SignupRead | StaffSignupRead])
def list_signups(
    tournament_id: int,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[SignupRead | StaffSignupRead]:
    visible_tournament(session, tournament_id, user)
    query = (
        select(TournamentSignup)
        .where(TournamentSignup.tournament_id == tournament_id)
        .order_by(TournamentSignup.id)
    )
    if get_application_role(user) != "admin":
        query = query.where(TournamentSignup.user_id == user.id)
    signups = session.scalars(query)
    if get_application_role(user) == "admin":
        return [StaffSignupRead.model_validate(tournament_signup) for tournament_signup in signups]
    return [SignupRead.model_validate(tournament_signup) for tournament_signup in signups]


@router.get(
    "/{tournament_id}/signups/{inscription_number}",
    response_model=SignupRead | StaffSignupRead,
)
def get_signup(
    tournament_id: int,
    inscription_number: str,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SignupRead | StaffSignupRead:
    visible_tournament(session, tournament_id, user)
    tournament_signup = session.scalar(
        select(TournamentSignup).where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.inscription_number == inscription_number,
        )
    )
    if tournament_signup is None or (
        tournament_signup.user_id != user.id and get_application_role(user) != "admin"
    ):
        raise HTTPException(status_code=404, detail="Registration not found")
    if get_application_role(user) == "admin":
        return StaffSignupRead.model_validate(tournament_signup)
    return SignupRead.model_validate(tournament_signup)


@router.get(
    "/{tournament_id}/signups/{inscription_number}/parental-term",
    response_model=ParentalTermDownloadUrlRead,
)
def get_parental_term_download_url(
    tournament_id: int,
    inscription_number: str,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> ParentalTermDownloadUrlRead:
    download_url, content_type, expires_in_seconds = read_tournament_signup_parental_term_download(
        session, tournament_id, inscription_number, user, file_storage
    )
    return ParentalTermDownloadUrlRead(
        download_url=download_url,
        content_type=content_type,
        expires_in_seconds=expires_in_seconds,
    )


@router.get(
    "/{tournament_id}/signups/{inscription_number}/payment",
    response_model=TournamentSignupPaymentInstructionsRead,
)
def get_tournament_signup_payment_instructions(
    tournament_id: int,
    inscription_number: str,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TournamentSignupPaymentInstructionsRead:
    return read_tournament_signup_payment_instructions(
        session,
        tournament_id,
        inscription_number,
        user,
    )
