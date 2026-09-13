from datetime import datetime, timezone
from typing import Final, cast
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from tournaments.models import (
    INSCRIPTION_NUMBER_SEQUENCE,
    Tournament,
    TournamentSignup,
)
from tournaments.schemas import TournamentCreate, TournamentSignupCreate


PUBLIC_TOURNAMENT_STATUSES: Final = ("published", "cancelled")
SEATED_SIGNUP_STATUSES: Final = (
    "awaiting_payment",
    "payment_in_review",
    "confirmed",
)
DUPLICATE_SIGNUP_CONSTRAINTS: Final = {
    "uq_tournament_signups_tournament_email",
    "uq_tournament_signups_tournament_document",
    "uq_tournament_signups_tournament_user",
}


class TournamentNotFoundError(Exception):
    pass


class RegistrationNotOpenError(Exception):
    pass


class DuplicateSignupError(Exception):
    pass


class InvalidTournamentTransitionError(Exception):
    pass


def luhn_check_digit(payload: str) -> int:
    """Return the Luhn digit appended to a numeric inscription payload."""

    total = 0
    for index, character in enumerate(reversed(payload)):
        digit = int(character)
        if index % 2 == 0:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return (10 - total % 10) % 10


def next_inscription_number(session: Session) -> str:
    sequence_value = cast(
        int | None,
        session.scalar(select(INSCRIPTION_NUMBER_SEQUENCE.next_value())),
    )
    if sequence_value is None:
        raise RuntimeError("Inscription sequence did not return a value")

    payload = f"{sequence_value:06d}"
    return f"KB-{payload}-{luhn_check_digit(payload)}"


def create_tournament(
    session: Session,
    tournament_input: TournamentCreate,
) -> Tournament:
    tournament = Tournament(**tournament_input.model_dump())
    session.add(tournament)
    session.commit()
    session.refresh(tournament)
    return tournament


def list_public_tournaments(
    session: Session,
    *,
    limit: int,
    offset: int,
) -> list[Tournament]:
    statement = (
        select(Tournament)
        .where(Tournament.status.in_(PUBLIC_TOURNAMENT_STATUSES))
        .order_by(Tournament.starts_at, Tournament.id)
        .limit(limit)
        .offset(offset)
    )
    return list(session.scalars(statement))


def get_public_tournament(session: Session, tournament_id: UUID) -> Tournament:
    tournament = session.scalar(
        select(Tournament).where(
            Tournament.id == tournament_id,
            Tournament.status.in_(PUBLIC_TOURNAMENT_STATUSES),
        )
    )
    if tournament is None:
        raise TournamentNotFoundError
    return tournament


def publish_tournament(session: Session, tournament_id: UUID) -> Tournament:
    tournament = session.scalar(
        select(Tournament)
        .where(Tournament.id == tournament_id)
        .with_for_update()
    )
    if tournament is None:
        raise TournamentNotFoundError
    if tournament.status == "published":
        return tournament
    if tournament.status != "draft":
        raise InvalidTournamentTransitionError

    tournament.status = "published"
    tournament.published_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(tournament)
    return tournament


def _registration_is_open(tournament: Tournament, now: datetime) -> bool:
    if tournament.status != "published":
        return False
    if (
        tournament.registration_opens_at is not None
        and now < tournament.registration_opens_at
    ):
        return False
    if (
        tournament.registration_closes_at is not None
        and now > tournament.registration_closes_at
    ):
        return False
    return True


def _raise_if_duplicate_signup(
    session: Session,
    *,
    tournament_id: UUID,
    user_id: UUID,
    signup_input: TournamentSignupCreate,
) -> None:
    duplicate_id = session.scalar(
        select(TournamentSignup.id)
        .where(
            TournamentSignup.tournament_id == tournament_id,
            or_(
                TournamentSignup.user_id == user_id,
                TournamentSignup.email == signup_input.email,
                (
                    (
                        TournamentSignup.document_issuing_country
                        == signup_input.document_issuing_country
                    )
                    & (TournamentSignup.document_type == signup_input.document_type)
                    & (TournamentSignup.document_id == signup_input.document_id)
                ),
            ),
        )
        .limit(1)
    )
    if duplicate_id is not None:
        raise DuplicateSignupError


def _is_duplicate_constraint(error: IntegrityError) -> bool:
    diagnostic = getattr(error.orig, "diag", None)
    constraint_name = getattr(diagnostic, "constraint_name", None)
    return constraint_name in DUPLICATE_SIGNUP_CONSTRAINTS


def create_tournament_signup(
    session: Session,
    *,
    tournament_id: UUID,
    user_id: UUID,
    signup_input: TournamentSignupCreate,
) -> TournamentSignup:
    tournament = session.scalar(
        select(Tournament)
        .where(Tournament.id == tournament_id)
        .with_for_update()
    )
    if tournament is None:
        raise TournamentNotFoundError
    if not _registration_is_open(tournament, datetime.now(timezone.utc)):
        raise RegistrationNotOpenError

    _raise_if_duplicate_signup(
        session,
        tournament_id=tournament_id,
        user_id=user_id,
        signup_input=signup_input,
    )

    occupied_seats = session.scalar(
        select(func.count(TournamentSignup.id)).where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.status.in_(SEATED_SIGNUP_STATUSES),
        )
    )
    is_full = (
        tournament.max_competitor_capacity is not None
        and (occupied_seats or 0) >= tournament.max_competitor_capacity
    )

    signup = TournamentSignup(
        **signup_input.model_dump(),
        tournament_id=tournament_id,
        user_id=user_id,
        inscription_number=next_inscription_number(session),
        status="waitlist" if is_full else "awaiting_payment",
    )
    session.add(signup)

    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if _is_duplicate_constraint(error):
            raise DuplicateSignupError from error
        raise

    session.refresh(signup)
    return signup


def get_user_signup_by_inscription_number(
    session: Session,
    *,
    inscription_number: str,
    user_id: UUID,
) -> TournamentSignup:
    signup = session.scalar(
        select(TournamentSignup).where(
            TournamentSignup.inscription_number == inscription_number,
            TournamentSignup.user_id == user_id,
        )
    )
    if signup is None:
        raise TournamentNotFoundError
    return signup


def list_visible_tournament_signups(
    session: Session,
    *,
    tournament_id: UUID,
    limit: int,
    offset: int,
) -> list[TournamentSignup]:
    get_public_tournament(session, tournament_id)
    statement = (
        select(TournamentSignup)
        .where(
            TournamentSignup.tournament_id == tournament_id,
            TournamentSignup.show_on_public_list.is_(True),
            TournamentSignup.status != "cancelled",
        )
        .order_by(TournamentSignup.created_at, TournamentSignup.id)
        .limit(limit)
        .offset(offset)
    )
    return list(session.scalars(statement))
