"""Read and configure tournament payment destinations without committing the caller's transaction."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.tournaments.models import TournamentPaymentSettings


def create_tournament_payment_settings(
    session: Session, tournament_id: int, pix_key: str | None
) -> None:
    normalized_pix_key = (pix_key or "").strip()
    if normalized_pix_key:
        session.add(
            TournamentPaymentSettings(
                tournament_id=tournament_id, pix_key=normalized_pix_key
            )
        )


def read_registration_pix_key_for_tournament(
    session: Session, tournament_id: int
) -> str | None:
    return session.scalar(
        select(TournamentPaymentSettings.pix_key).where(
            TournamentPaymentSettings.tournament_id == tournament_id
        )
    )
