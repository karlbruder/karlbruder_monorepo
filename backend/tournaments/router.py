"""Tournament catalog routes with server-side guest/member/admin boundaries."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import get_application_role, get_optional_user, require_admin
from database import get_session
from models import User
from tournaments.models import Tournament
from tournaments.schemas import TournamentCreate, TournamentRead

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


def _can_view_internal(user: User | None) -> bool:
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
    user: Annotated[User | None, Depends(get_optional_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[Tournament]:
    query = select(Tournament).order_by(Tournament.starts_at, Tournament.id)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    return list(session.scalars(query))


@router.get("/{tournament_id}", response_model=TournamentRead)
def get_tournament(
    tournament_id: int,
    user: Annotated[User | None, Depends(get_optional_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Tournament:
    query = select(Tournament).where(Tournament.id == tournament_id)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    tournament = session.scalar(query)
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament
