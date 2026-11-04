"""Shared file metadata and immutable archive records."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Integer,
    ForeignKey,
    Text,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel


class StoredFile(BaseModel):
    __tablename__ = "stored_files"
    __table_args__ = (
        UniqueConstraint("storage_key", name="uq_stored_files_storage_key"),
        CheckConstraint("size_bytes >= 0", name="ck_stored_files_size_nonnegative"),
        {"schema": "public"},
    )

    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)


class ArchivedFile(BaseModel):
    __tablename__ = "archived_files"
    __table_args__ = {"schema": "public"}

    file_id: Mapped[int] = mapped_column(
        ForeignKey("public.stored_files.id", ondelete="RESTRICT"), nullable=False
    )
    source_url: Mapped[str | None] = mapped_column(Text)
    final_url: Mapped[str | None] = mapped_column(Text)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    archived_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    file: Mapped[StoredFile] = relationship()
