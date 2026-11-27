"""Staff selection from a tournament's waitlist."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.auth.supabase.roles import get_application_role
from app.tournaments.exceptions import (
    ParentalConsentFormRequiredError,
    RegistrationConflictError,
)
from app.tournaments.models import Tournament, TournamentRegistration, TournamentRegistrationDocument
from app.tournaments.services.tournament_local_dates import is_minor_at_tournament_start
from app.tournaments.services.tournament_registrations import list_tournament_registrations_for_staff


def _require_admin(actor: User) -> None:
    if get_application_role(actor) != "admin":
        raise AdminAccessRequiredException()


def _confirmed_count(session: Session, tournament_id: int) -> int:
    return session.scalar(
        select(func.count()).select_from(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_status == "confirmed",
        )
    ) or 0


def read_waitlist(session: Session, tournament_id: int, actor: User) -> dict:
    _require_admin(actor)
    registrations = list_tournament_registrations_for_staff(session, tournament_id, actor)
    tournament = session.get(Tournament, tournament_id)
    return {
        "competitor_capacity": tournament.competitor_capacity,
        "confirmed_count": _confirmed_count(session, tournament_id),
        "registrations": [row for row in registrations if row["registration_status"] == "waitlist"],
    }


def confirm_waitlist_registration(
    session: Session, tournament_id: int, registration_number: str, actor: User,
) -> dict:
    _require_admin(actor)
    tournament = session.scalar(
        select(Tournament).where(Tournament.id == tournament_id)
        .with_for_update(of=Tournament).execution_options(populate_existing=True)
    )
    registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        ).with_for_update(of=TournamentRegistration).execution_options(populate_existing=True)
    ) if tournament else None
    if registration is None or registration.registration_status != "waitlist":
        raise RegistrationConflictError("Registration is no longer on the waitlist")
    if is_minor_at_tournament_start(registration.birth_date, tournament.starts_at):
        parental_form = session.scalar(
            select(TournamentRegistrationDocument.id).where(
                TournamentRegistrationDocument.registration_id == registration.id,
                TournamentRegistrationDocument.document_type == "parental_consent_form",
            ).limit(1)
        )
        if parental_form is None:
            raise ParentalConsentFormRequiredError("Parental consent form required")
    if tournament.competitor_capacity is not None and _confirmed_count(session, tournament_id) >= tournament.competitor_capacity:
        raise RegistrationConflictError("No seat is available")
    registration.registration_status = "confirmed"
    session.commit()
    return {"registration_status": "confirmed"}
