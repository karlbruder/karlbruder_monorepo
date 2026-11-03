"""How participants pay the inscription fee for one tournament."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.payments.models.pix_recipient import PixRecipient
    from app.tournaments.models.tournament import Tournament


class TournamentInscriptionPaymentConfig(Base):
    __tablename__ = "tournament_inscription_payment_configs"
    __table_args__ = (
        UniqueConstraint("tournament_id", name="uq_tournament_inscription_payment_configs_tournament"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournaments.id", ondelete="CASCADE"),
        nullable=False,
    )
    pix_recipient_id: Mapped[int | None] = mapped_column(
        ForeignKey("public.pix_recipients.id", ondelete="SET NULL"),
        nullable=True,
    )

    tournament: Mapped["Tournament"] = relationship()
    pix_recipient: Mapped["PixRecipient | None"] = relationship()
