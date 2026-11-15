"""Tags selected for a tournament registration."""

from sqlalchemy import ForeignKeyConstraint, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class RegistrationTag(BaseModel):
    __tablename__ = "registration_tags"
    __table_args__ = (
        ForeignKeyConstraint(
            ["registration_id", "tournament_id"],
            ["public.tournament_registrations.id", "public.tournament_registrations.tournament_id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tag_id", "tournament_id"],
            ["public.tournament_tags.id", "public.tournament_tags.tournament_id"],
            ondelete="RESTRICT",
        ),
        UniqueConstraint("registration_id", "tag_id", name="uq_registration_tags_registration_tag"),
        {"schema": "public"},
    )

    registration_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tournament_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tag_id: Mapped[int] = mapped_column(Integer, nullable=False)
