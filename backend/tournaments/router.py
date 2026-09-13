from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from tournaments import service
from tournaments.schemas import (
    TournamentCreate,
    TournamentResponse,
    TournamentSignupCreate,
    TournamentSignupListItem,
    TournamentSignupResponse,
)


router = APIRouter(prefix="/api", tags=["tournaments"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "/tournaments",
    response_model=TournamentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tournament(
    tournament_input: TournamentCreate,
    session: DatabaseSession,
    _current_user: CurrentUser,
) -> TournamentResponse:
    # TODO 2
    return service.create_tournament(session, tournament_input)


@router.get("/tournaments", response_model=list[TournamentResponse])
def list_tournaments(
    session: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[TournamentResponse]:
    return service.list_public_tournaments(session, limit=limit, offset=offset)


@router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
def get_tournament(
    tournament_id: UUID,
    session: DatabaseSession,
) -> TournamentResponse:
    try:
        return service.get_public_tournament(session, tournament_id)
    except service.TournamentNotFoundError as error:
        raise HTTPException(status_code=404, detail="Tournament not found") from error


@router.post(
    "/tournaments/{tournament_id}/publish",
    response_model=TournamentResponse,
)
def publish_tournament(
    tournament_id: UUID,
    session: DatabaseSession,
    _current_user: CurrentUser,
) -> TournamentResponse:
    # TODO 2
    try:
        return service.publish_tournament(session, tournament_id)
    except service.TournamentNotFoundError as error:
        raise HTTPException(status_code=404, detail="Tournament not found") from error
    except service.InvalidTournamentTransitionError as error:
        raise HTTPException(
            status_code=409,
            detail="Tournament cannot be published from its current status",
        ) from error


@router.post(
    "/tournaments/{tournament_id}/signups",
    response_model=TournamentSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tournament_signup(
    tournament_id: UUID,
    signup_input: TournamentSignupCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> TournamentSignupResponse:
    try:
        return service.create_tournament_signup(
            session,
            tournament_id=tournament_id,
            user_id=current_user.id,
            signup_input=signup_input,
        )
    except service.TournamentNotFoundError as error:
        raise HTTPException(status_code=404, detail="Tournament not found") from error
    except service.RegistrationNotOpenError as error:
        raise HTTPException(
            status_code=400,
            detail="Tournament registration is not open",
        ) from error
    except service.DuplicateSignupError as error:
        raise HTTPException(
            status_code=409,
            detail="Email or document already registered for this tournament",
        ) from error


@router.get(
    "/tournament-signups/{inscription_number}",
    response_model=TournamentSignupResponse,
)
def get_tournament_signup(
    inscription_number: str,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> TournamentSignupResponse:
    try:
        return service.get_user_signup_by_inscription_number(
            session,
            inscription_number=inscription_number,
            user_id=current_user.id,
        )
    except service.TournamentNotFoundError as error:
        raise HTTPException(status_code=404, detail="Signup not found") from error


@router.get(
    "/tournaments/{tournament_id}/signups",
    response_model=list[TournamentSignupListItem],
)
def list_tournament_signups(
    tournament_id: UUID,
    session: DatabaseSession,
    _current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[TournamentSignupListItem]:
    # TODO 2
    try:
        signups = service.list_visible_tournament_signups(
            session,
            tournament_id=tournament_id,
            limit=limit,
            offset=offset,
        )
    except service.TournamentNotFoundError as error:
        raise HTTPException(status_code=404, detail="Tournament not found") from error

    return [
        TournamentSignupListItem(
            inscription_number=signup.inscription_number,
            display_name=signup.social_name or signup.full_name,
            school_name=signup.school_name,
        )
        for signup in signups
    ]
