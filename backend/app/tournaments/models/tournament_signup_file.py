"""Stored file metadata for a tournament registration."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.tournaments.models.tournament_signup import TournamentSignup


class TournamentSignupFile(Base):
    __tablename__ = "tournament_signup_files"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('parental_term', 'payment_proof')",
            name="ck_tournament_signup_files_kind",
        ),
        CheckConstraint(
            "size_bytes BETWEEN 1 AND 10485760",
            name="ck_tournament_signup_files_size",
        ),
        UniqueConstraint("storage_key", name="uq_tournament_signup_files_storage_key"),
        Index("ix_tournament_signup_files_signup_id", "signup_id"),
        Index(
            "uq_tournament_signup_files_one_parental_term",
            "signup_id",
            unique=True,
            postgresql_where=text("kind = 'parental_term'"),
            sqlite_where=text("kind = 'parental_term'"),
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    signup_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_signups.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    signup: Mapped[TournamentSignup] = relationship(back_populates="files")
