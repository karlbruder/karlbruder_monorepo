"""Tournament tag configuration and registration selections."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.auth.models import User
from app.auth.supabase.roles import get_application_role
from app.tournaments.exceptions import (
    RegistrationConflictError,
    RegistrationNotAllowedError,
    RegistrationResourceNotFoundError,
)
from app.tournaments.models import RegistrationTag, TournamentRegistration, TournamentTag
from app.tournaments.services import tournament_local_dates
from app.tournaments.services.registration_acceptances import parental_consent_required
from app.tournaments.services.tournament_registrations import visible_tournament


def _admin(actor: User) -> None:
    if get_application_role(actor) != "admin":
        raise RegistrationNotAllowedError("Guild staff access is required")


def list_tags(session: Session, tournament_id: int, actor: User) -> list[TournamentTag]:
    visible_tournament(session, tournament_id, actor)
    return list(session.scalars(select(TournamentTag).where(TournamentTag.tournament_id == tournament_id).order_by(TournamentTag.id)))


def save_tag(session: Session, tournament_id: int, actor: User, name: str, description: str, tag_id: int | None = None) -> TournamentTag:
    _admin(actor)
    visible_tournament(session, tournament_id, actor, lock=True)
    tag = session.get(TournamentTag, tag_id) if tag_id is not None else None
    if tag_id is not None and (tag is None or tag.tournament_id != tournament_id):
        raise RegistrationResourceNotFoundError("Tag not found")
    if tag is None:
        tag = TournamentTag(tournament_id=tournament_id, name=name, eligibility_description=description)
        session.add(tag)
    else:
        tag.name = name
        tag.eligibility_description = description
    session.commit()
    session.refresh(tag)
    return tag


def delete_tag(session: Session, tournament_id: int, tag_id: int, actor: User) -> None:
    _admin(actor)
    visible_tournament(session, tournament_id, actor, lock=True)
    tag = session.get(TournamentTag, tag_id)
    if tag is None or tag.tournament_id != tournament_id:
        raise RegistrationResourceNotFoundError("Tag not found")
    if session.scalar(select(RegistrationTag.id).where(RegistrationTag.tag_id == tag_id).limit(1)) is not None:
        raise RegistrationConflictError("Tag is in use")
    session.delete(tag)
    session.commit()


def validate_tags(session: Session, tournament_id: int, tag_ids: list[int]) -> None:
    if len(set(tag_ids)) != len(tag_ids):
        raise RegistrationNotAllowedError("Duplicate tags are not allowed")
    found = set(session.scalars(select(TournamentTag.id).where(TournamentTag.tournament_id == tournament_id, TournamentTag.id.in_(tag_ids))))
    if found != set(tag_ids):
        raise RegistrationNotAllowedError("Tags must belong to the tournament")


def list_registration_tags(session: Session, tournament_id: int, actor: User) -> list[dict]:
    """Return the staff athlete list without private registration fields."""
    _admin(actor)
    visible_tournament(session, tournament_id, actor)
    registrations = session.scalars(
        select(TournamentRegistration)
        .options(selectinload(TournamentRegistration.documents), selectinload(TournamentRegistration.tournament))
        .where(TournamentRegistration.tournament_id == tournament_id)
        .order_by(TournamentRegistration.full_name, TournamentRegistration.id)
    ).all()
    selections = session.execute(
        select(RegistrationTag.registration_id, TournamentTag)
        .join(TournamentTag, TournamentTag.id == RegistrationTag.tag_id)
        .where(RegistrationTag.tournament_id == tournament_id)
        .order_by(TournamentTag.id)
    ).all()
    tags_by_registration: dict[int, list[TournamentTag]] = {}
    for registration_id, tag in selections:
        tags_by_registration.setdefault(registration_id, []).append(tag)
    return [
        {
            "registration_number": registration.registration_number,
            "full_name": registration.full_name,
            "social_name": registration.social_name,
            "registration_status": registration.registration_status,
            "parental_consent_required": parental_consent_required(registration),
            "tags": tags_by_registration.get(registration.id, []),
        }
        for registration in registrations
    ]


def registration_tags(session: Session, tournament_id: int, number: str, actor: User, tag_ids: list[int] | None = None, *, staff: bool = False) -> list[TournamentTag]:
    if staff:
        _admin(actor)
    tournament = visible_tournament(session, tournament_id, actor, lock=tag_ids is not None)
    registration = session.scalar(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id, TournamentRegistration.registration_number == number))
    if registration is None or (not staff and registration.user_id != actor.id):
        raise RegistrationResourceNotFoundError("Registration not found")
    if tag_ids is not None:
        if not staff:
            today = tournament_local_dates.current_local_calendar_date()
            if (registration.registration_status == "cancelled" or tournament.is_registration_closed or tournament.registration_opens_on is None or tournament.registration_closes_on is None or not tournament.registration_opens_on <= today <= tournament.registration_closes_on):
                raise RegistrationNotAllowedError("Registration is closed")
        validate_tags(session, tournament_id, tag_ids)
        session.execute(delete(RegistrationTag).where(RegistrationTag.registration_id == registration.id))
        session.add_all(RegistrationTag(registration_id=registration.id, tournament_id=tournament_id, tag_id=tag_id) for tag_id in tag_ids)
        session.commit()
    return list(session.scalars(select(TournamentTag).join(RegistrationTag, RegistrationTag.tag_id == TournamentTag.id).where(RegistrationTag.registration_id == registration.id).order_by(TournamentTag.id)))
