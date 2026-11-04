"""One stored file submitted for a specific tournament registration purpose."""

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

from app.core.files.models import StoredFile
from app.database import Base
from app.tournaments.models.tournament_registration import TournamentRegistration


class TournamentRegistrationDocument(Base):
    __tablename__ = "tournament_registration_documents"
    __table_args__ = (
        CheckConstraint(
            "document_type IN ('parental_consent_form', 'payment_proof')",
            name="ck_tournament_registration_documents_document_type",
        ),
        UniqueConstraint("file_id", name="uq_tournament_registration_documents_file"),
        Index(
            "ix_tournament_registration_documents_registration_id", "registration_id"
        ),
        Index(
            "uq_tournament_registration_documents_one_parental_consent_form",
            "registration_id",
            unique=True,
            postgresql_where=text("document_type = 'parental_consent_form'"),
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    registration_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_registrations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    file_id: Mapped[int] = mapped_column(
        ForeignKey("public.stored_files.id", ondelete="RESTRICT"), nullable=False
    )
    document_type: Mapped[str] = mapped_column(String(32), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    registration: Mapped[TournamentRegistration] = relationship(
        back_populates="documents"
    )
    file: Mapped[StoredFile] = relationship()
