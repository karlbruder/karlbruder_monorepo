"""Tournament-specific tag definitions."""

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class TournamentTag(BaseModel):
    __tablename__ = "tournament_tags"
    __table_args__ = (
        UniqueConstraint("id", "tournament_id", name="uq_tournament_tags_id_tournament"),
        {"schema": "public"},
    )

    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournaments.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    eligibility_description: Mapped[str] = mapped_column(Text, nullable=False)
