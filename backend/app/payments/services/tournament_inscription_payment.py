"""Tournament inscription fee collection configuration."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.payments.models import PixRecipient, TournamentInscriptionPaymentConfig


def create_tournament_inscription_payment_config(
    session: Session,
    tournament_id: int,
    pix_key: str | None,
) -> None:
    """Persist inscription Pix settings when an admin creates a tournament."""
    normalized_pix_key = (pix_key or "").strip()
    if not normalized_pix_key:
        return
    pix_recipient = PixRecipient(pix_key=normalized_pix_key)
    session.add(pix_recipient)
    session.flush()
    session.add(
        TournamentInscriptionPaymentConfig(
            tournament_id=tournament_id,
            pix_recipient_id=pix_recipient.id,
        )
    )


def read_inscription_pix_key_for_tournament(
    session: Session,
    tournament_id: int,
) -> str | None:
    """Return the configured Pix key for tournament inscription fees, if any."""
    config_row = session.scalar(
        select(TournamentInscriptionPaymentConfig)
        .where(TournamentInscriptionPaymentConfig.tournament_id == tournament_id)
        .limit(1)
    )
    if config_row is None or config_row.pix_recipient_id is None:
        return None
    pix_recipient = session.get(PixRecipient, config_row.pix_recipient_id)
    if pix_recipient is None:
        return None
    return pix_recipient.pix_key
