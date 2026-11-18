"""A named tournament document and its published versions."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel

if TYPE_CHECKING:
    from .tournament_document_version import TournamentDocumentVersion


class TournamentDocument(BaseModel):
    __tablename__ = "tournament_documents"
    __table_args__ = (
        UniqueConstraint("tournament_id", "purpose", name="uq_tournament_document_purpose"),
        CheckConstraint(
            "purpose IS NULL OR purpose IN ('rules', 'cancellation_policy')",
            name="ck_tournament_document_purpose",
        ),
        {"schema": "public"},
    )

    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournaments.id", ondelete="CASCADE"), nullable=False
    )
    purpose: Mapped[str | None] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    versions: Mapped[list[TournamentDocumentVersion]] = relationship(
        back_populates="document",
        order_by="desc(TournamentDocumentVersion.id)",
        passive_deletes=True,
    )

    @property
    def current_version(self) -> TournamentDocumentVersion | None:
        return max(self.versions, key=lambda version: version.id or 0, default=None)
