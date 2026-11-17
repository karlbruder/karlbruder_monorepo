"""A published version of a tournament document."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel
from app.core.files.models import ArchivedFile

if TYPE_CHECKING:
    from .tournament_document import TournamentDocument


class TournamentDocumentVersion(BaseModel):
    __tablename__ = "tournament_document_versions"
    __table_args__ = {"schema": "public"}

    document_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_documents.id", ondelete="CASCADE"), nullable=False
    )
    archive_id: Mapped[int] = mapped_column(
        ForeignKey("public.archived_files.id", ondelete="RESTRICT"), nullable=False
    )
    document: Mapped[TournamentDocument] = relationship(back_populates="versions")
    archive: Mapped[ArchivedFile] = relationship()
