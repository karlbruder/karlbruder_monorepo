"""Tournament catalog routes with server-side guest/member/admin boundaries."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import (
    get_application_role,
    get_current_user,
    require_admin,
    require_authenticated_user,
)
from database import get_session
from models import AnonymousUser, User
from tournaments.models import Tournament, TournamentSignup
from tournaments.schemas import (
    SignupCreate,
    SignupRead,
    StaffSignupRead,
    TournamentCreate,
    TournamentRead,
)
from tournaments.signups import create_signup, visible_tournament

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


def _can_view_internal(user: User | AnonymousUser) -> bool:
    return get_application_role(user) in ("guild_member", "admin")


@router.post("", response_model=TournamentRead, status_code=status.HTTP_201_CREATED)
def create_tournament(
    payload: TournamentCreate,
    _admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> Tournament:
    tournament = Tournament(**payload.model_dump())
    session.add(tournament)
    session.commit()
    session.refresh(tournament)
    return tournament


@router.get("", response_model=list[TournamentRead])
def list_tournaments(
    user: Annotated[User | AnonymousUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[Tournament]:
    query = select(Tournament).order_by(Tournament.starts_at, Tournament.id)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    return list(session.scalars(query))


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
    "/{tournament_id}/signups", response_model=SignupRead, status_code=status.HTTP_201_CREATED
)
def register_for_tournament(
    tournament_id: int,
    payload: SignupCreate,
    request: Request,
    user: Annotated[User, Depends(require_authenticated_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SignupRead:
    if request.client is None:
        raise HTTPException(status_code=503, detail="Client address unavailable")
    signup = create_signup(
        session, tournament_id, user, payload, request.client.host
    )
    return SignupRead.model_validate(signup)


@router.get("/{tournament_id}/signups", response_model=list[StaffSignupRead])
def list_signups(
    tournament_id: int,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[StaffSignupRead]:
    visible_tournament(session, tournament_id, admin)
    signups = session.scalars(
        select(TournamentSignup)
        .where(TournamentSignup.tournament_id == tournament_id)
        .order_by(TournamentSignup.id)
    )
    return [StaffSignupRead.model_validate(signup) for signup in signups]


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
    signup = session.scalar(
        select(TournamentSignup).where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.inscription_number == inscription_number,
        )
    )
    if signup is None or (
        signup.user_id != user.id and get_application_role(user) != "admin"
    ):
        raise HTTPException(status_code=404, detail="Registration not found")
    if get_application_role(user) == "admin":
        return StaffSignupRead.model_validate(signup)
    return SignupRead.model_validate(signup)
