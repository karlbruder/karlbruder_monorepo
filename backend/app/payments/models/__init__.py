"""Payment domain tables in PostgreSQL public."""

from app.payments.models.pix_recipient import PixRecipient
from app.payments.models.tournament_inscription_payment_config import (
    TournamentInscriptionPaymentConfig,
)

__all__ = ["PixRecipient", "TournamentInscriptionPaymentConfig"]
