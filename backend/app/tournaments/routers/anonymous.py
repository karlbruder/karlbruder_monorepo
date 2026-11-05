"""Tournament catalog routes accessible to guests and signed-in users."""

from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
)
from app.auth.models import AnonymousUser, User
from app.auth.supabase.roles import get_application_role
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.models import Tournament
from app.tournaments.schemas import (
    TournamentList,
    TournamentRead,
)
from app.tournaments.services import (
    TOURNAMENT_LOCAL_TIMEZONE,
)
from app.tournaments.services.tournament_policies import (
    project_tournament,
)

router = APIRouter(prefix="/api/tournaments")


def _can_view_internal(user: User | AnonymousUser) -> bool:
    return get_application_role(user) in ("guild_member", "admin")


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
    storage: Annotated[FileStorage, Depends(get_file_storage)],
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
    return TournamentList(
        items=[project_tournament(item, storage) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{tournament_id}", response_model=TournamentRead)
def get_tournament(
    tournament_id: int,
    user: Annotated[User | AnonymousUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[FileStorage, Depends(get_file_storage)],
) -> TournamentRead:
    query = select(Tournament).where(Tournament.id == tournament_id)
    if not _can_view_internal(user):
        query = query.where(Tournament.is_internal.is_(False))
    tournament = session.scalar(query)
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return project_tournament(tournament, storage)
