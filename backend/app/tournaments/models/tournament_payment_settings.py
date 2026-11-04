"""Optional Pix destination for one tournament."""

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class TournamentPaymentSettings(BaseModel):
    __tablename__ = "tournament_payment_settings"
    __table_args__ = (
        UniqueConstraint(
            "tournament_id", name="uq_tournament_payment_settings_tournament"
        ),
        {"schema": "public"},
    )

    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournaments.id", ondelete="CASCADE"), nullable=False
    )
    pix_key: Mapped[str | None] = mapped_column(String(512))
