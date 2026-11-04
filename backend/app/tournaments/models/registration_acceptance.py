"""Append-only evidence of the separate choices made at registration."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RegistrationAcceptance(Base):
    __tablename__ = "registration_acceptances"
    __table_args__ = (
        CheckConstraint(
            "declares_truthful_information AND declares_has_required_equipment "
            "AND declares_physically_fit AND accepts_rules AND accepts_data_processing "
            "AND acknowledges_inherent_risks AND accepts_cancellation_policy",
            name="ck_registration_acceptances_required_choices",
        ),
        CheckConstraint(
            "language IN ('pt', 'en')", name="ck_registration_acceptances_language"
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    registration_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_registrations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    accepted_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
    declares_truthful_information: Mapped[bool] = mapped_column(Boolean, nullable=False)
    declares_has_required_equipment: Mapped[bool] = mapped_column(
        Boolean, nullable=False
    )
    declares_physically_fit: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepts_rules: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepts_data_processing: Mapped[bool] = mapped_column(Boolean, nullable=False)
    acknowledges_inherent_risks: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepts_cancellation_policy: Mapped[bool] = mapped_column(Boolean, nullable=False)
    authorizes_image_use: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepted_terms_version: Mapped[str] = mapped_column(String(100), nullable=False)
    accepted_rules_version: Mapped[str] = mapped_column(String(100), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    accepted_from_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    language: Mapped[str] = mapped_column(String(2), nullable=False)
    content_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    rules_archive_id: Mapped[int | None] = mapped_column(
        ForeignKey("public.archived_files.id", ondelete="RESTRICT")
    )
    cancellation_policy_archive_id: Mapped[int | None] = mapped_column(
        ForeignKey("public.archived_files.id", ondelete="RESTRICT")
    )

    registration = relationship("TournamentRegistration", back_populates="acceptances")
