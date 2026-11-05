"""Staff tournament configuration with serialized capacity and deletion checks."""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.supabase.roles import get_application_role
from app.core.files import FileStorage
from app.tournaments.exceptions import (
    RegistrationConflictError,
    RegistrationNotAllowedError,
    RegistrationResourceNotFoundError,
)
from app.tournaments.models import (
    Tournament,
    TournamentPaymentSettings,
    TournamentRegistration,
)
from app.tournaments.schemas import (
    StaffTournamentList,
    StaffTournamentRead,
    TournamentCreate,
)
from app.tournaments.services.policy_fetch import PolicyFetcher
from app.tournaments.services.registration_documents import (
    delete_storage_object_quietly,
)
from app.tournaments.services.tournament_policies import (
    prepare_policy_archives,
    project_tournament,
)
from app.tournaments.services.tournament_slugs import resolve_tournament_slug


def _require_admin(actor: User) -> None:
    if get_application_role(actor) != "admin":
        raise RegistrationNotAllowedError("Guild staff access is required")


def _staff_projection(
    tournament: Tournament, pix_key: str | None, storage: FileStorage
) -> StaffTournamentRead:
    return StaffTournamentRead(
        **project_tournament(tournament, storage).model_dump(),
        pix_key=pix_key,
    )


def list_staff_tournaments(
    session: Session, actor: User, storage: FileStorage, *, limit: int, offset: int
) -> StaffTournamentList:
    _require_admin(actor)
    total = session.scalar(select(func.count()).select_from(Tournament)) or 0
    rows = session.execute(
        select(Tournament, TournamentPaymentSettings.pix_key)
        .outerjoin(
            TournamentPaymentSettings,
            TournamentPaymentSettings.tournament_id == Tournament.id,
        )
        .order_by(Tournament.starts_at, Tournament.id)
        .limit(limit)
        .offset(offset)
    ).all()
    return StaffTournamentList(
        items=[_staff_projection(event, pix_key, storage) for event, pix_key in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


def read_staff_tournament(
    session: Session, actor: User, tournament_id: int, storage: FileStorage
) -> StaffTournamentRead:
    _require_admin(actor)
    row = session.execute(
        select(Tournament, TournamentPaymentSettings.pix_key)
        .outerjoin(
            TournamentPaymentSettings,
            TournamentPaymentSettings.tournament_id == Tournament.id,
        )
        .where(Tournament.id == tournament_id)
    ).one_or_none()
    if row is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    return _staff_projection(row[0], row[1], storage)


def update_tournament(
    session: Session,
    actor: User,
    tournament_id: int,
    payload: TournamentCreate,
    storage: FileStorage,
    fetcher: PolicyFetcher,
) -> StaffTournamentRead:
    _require_admin(actor)
    if (
        session.scalar(select(Tournament.id).where(Tournament.id == tournament_id))
        is None
    ):
        raise RegistrationResourceNotFoundError("Tournament not found")

    values = payload.model_dump(exclude={"pix_key"})
    values["slug"] = resolve_tournament_slug(
        payload.name, payload.discipline, payload.starts_at, payload.slug
    )
    draft = Tournament(**values)
    created_keys: list[str] = []
    try:
        # Capture external policies before taking the tournament lock.
        prepare_policy_archives(draft, storage, fetcher, created_keys)
        tournament = session.scalar(
            select(Tournament)
            .where(Tournament.id == tournament_id)
            .with_for_update(of=Tournament)
            .execution_options(populate_existing=True)
        )
        if tournament is None:
            raise RegistrationResourceNotFoundError("Tournament not found")
        payment = session.scalar(
            select(TournamentPaymentSettings)
            .where(TournamentPaymentSettings.tournament_id == tournament_id)
            .execution_options(populate_existing=True)
        )
        confirmed = (
            session.scalar(
                select(func.count())
                .select_from(TournamentRegistration)
                .where(
                    TournamentRegistration.tournament_id == tournament_id,
                    TournamentRegistration.registration_status == "confirmed",
                )
            )
            or 0
        )
        if (
            payload.competitor_capacity is not None
            and payload.competitor_capacity < confirmed
        ):
            raise RegistrationConflictError(
                "Capacity cannot be below confirmed participation"
            )
        duplicate = session.scalar(
            select(Tournament.id).where(
                Tournament.slug == values["slug"], Tournament.id != tournament_id
            )
        )
        if duplicate is not None:
            raise RegistrationConflictError("Tournament slug already exists")
        for name, value in values.items():
            setattr(tournament, name, value)
        for name in ("rules", "cancellation_policy"):
            setattr(tournament, f"{name}_archive", getattr(draft, f"{name}_archive"))
        pix_key = (payload.pix_key or "").strip() or None
        if payment is None and pix_key is not None:
            session.add(
                TournamentPaymentSettings(tournament_id=tournament_id, pix_key=pix_key)
            )
        elif payment is not None:
            payment.pix_key = pix_key
        session.flush()
        result = _staff_projection(tournament, pix_key, storage)
        session.commit()
        return result
    except Exception as error:
        session.rollback()
        for key in created_keys:
            delete_storage_object_quietly(storage, key)
        if (
            isinstance(error, IntegrityError)
            and getattr(getattr(error.orig, "diag", None), "constraint_name", None)
            == "uq_tournaments_slug"
        ):
            raise RegistrationConflictError("Tournament slug already exists") from error
        raise


def delete_tournament(session: Session, actor: User, tournament_id: int) -> None:
    _require_admin(actor)
    try:
        tournament = session.scalar(
            select(Tournament)
            .where(Tournament.id == tournament_id)
            .with_for_update(of=Tournament)
        )
        if tournament is None:
            raise RegistrationResourceNotFoundError("Tournament not found")
        if (
            session.scalar(
                select(TournamentRegistration.id)
                .where(TournamentRegistration.tournament_id == tournament_id)
                .limit(1)
            )
            is not None
        ):
            raise RegistrationConflictError(
                "Tournament with registrations cannot be deleted"
            )
        session.delete(tournament)
        session.commit()
    except Exception:
        session.rollback()
        raise
