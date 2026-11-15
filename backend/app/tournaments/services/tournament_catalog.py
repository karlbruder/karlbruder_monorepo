"""Tournament visibility, catalog reads, and public projection."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import TYPE_CHECKING
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.auth.models import AnonymousUser, User
from app.auth.supabase.roles import get_application_role
from app.tournaments.exceptions import RegistrationResourceNotFoundError
from app.tournaments.models import Tournament
from .tournament_local_dates import TOURNAMENT_LOCAL_TIMEZONE
from .registration_acceptances import build_registration_acceptance_content, calculate_registration_acceptance_digest

if TYPE_CHECKING:
    from app.tournaments.schemas import TournamentList, TournamentRead


def can_view_internal_tournaments(user: User | AnonymousUser) -> bool:
    return get_application_role(user) in ("guild_member", "admin")


def load_visible_tournament(
    session: Session,
    tournament_id: int,
    user: User | AnonymousUser,
    *,
    lock: bool = False,
) -> Tournament:
    """Load a tournament the caller may see, optionally with a row lock.

    Regular users receive 404 for internal events. Missing rows also return 404.
    """

    query = select(Tournament).where(Tournament.id == tournament_id)
    if not can_view_internal_tournaments(user):
        query = query.where(Tournament.is_internal.is_(False))
    if lock:
        query = query.with_for_update(of=Tournament)
    tournament = session.scalar(query)
    if tournament is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    return tournament


def build_tournament_read(tournament: Tournament) -> TournamentRead:
    from app.tournaments.schemas import TournamentRead

    values = {
        name: getattr(tournament, name)
        for name in TournamentRead.model_fields
        if name
        not in {
            "acceptance_content",
            "acceptance_tokens",
        }
    }
    contents = {
        language: build_registration_acceptance_content(tournament, language) for language in ("pt", "en")
    }
    values.update(
        acceptance_content=contents,
        acceptance_tokens={
            language: calculate_registration_acceptance_digest(content) for language, content in contents.items()
        },
    )
    return TournamentRead(**values)


def list_visible_tournaments(
    session: Session,
    user: User | AnonymousUser,
    *,
    name: str | None,
    starts_from: date | None,
    starts_to: date | None,
    limit: int,
    offset: int,
) -> TournamentList:
    from app.tournaments.schemas import TournamentList

    query = select(Tournament)
    if not can_view_internal_tournaments(user):
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
    total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = session.scalars(
        query.order_by(Tournament.starts_at, Tournament.id).limit(limit).offset(offset)
    )
    return TournamentList(
        items=[build_tournament_read(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )
