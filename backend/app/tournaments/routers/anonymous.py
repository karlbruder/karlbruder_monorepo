"""Tournament catalog routes accessible to guests and signed-in users."""

from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.auth.models import AnonymousUser, User
from app.core.db.session import get_session
from app.core.files import FileStorage, get_file_storage
from app.tournaments.schemas import (
    TournamentList,
    TournamentRead,
    TournamentProductRead,
)
from app.tournaments.services.tournament_catalog import (
    list_visible_tournaments,
    build_tournament_read,
    load_visible_tournament,
)
from app.tournaments.services.tournament_products import list_tournament_products

router = APIRouter(prefix="/api/tournaments")


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
    if starts_from is not None and starts_to is not None and starts_to < starts_from:
        raise HTTPException(
            status_code=422, detail="starts_to must not precede starts_from"
        )
    return list_visible_tournaments(
        session,
        user,
        storage,
        name=name,
        starts_from=starts_from,
        starts_to=starts_to,
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
    return build_tournament_read(load_visible_tournament(session, tournament_id, user), storage)


@router.get("/{tournament_id}/products", response_model=list[TournamentProductRead])
def get_tournament_products(
    tournament_id: int,
    user: Annotated[User | AnonymousUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[TournamentProductRead]:
    products = list_tournament_products(session, tournament_id, user)
    if products is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return products
