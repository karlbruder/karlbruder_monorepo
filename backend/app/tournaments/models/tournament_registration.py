"""Tournament registration row."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel
from app.tournaments.models.tournament import Tournament

if TYPE_CHECKING:
    from .registration_acceptance import RegistrationAcceptance
    from app.tournaments.models.tournament_registration_document import (
        TournamentRegistrationDocument,
    )


class TournamentRegistration(BaseModel):
    __tablename__ = "tournament_registrations"
    __table_args__ = (
        UniqueConstraint(
            "registration_number",
            name="uq_tournament_registrations_registration_number",
        ),
        CheckConstraint(
            "registration_status IN ('awaiting_payment', 'awaiting_payment_confirmation', "
            "'confirmed', 'waitlist', 'cancelled')",
            name="ck_tournament_registrations_status",
        ),
        CheckConstraint(
            "identity_document_type IN ('cpf', 'passport')",
            name="ck_tournament_registrations_identity_document_type",
        ),
        CheckConstraint(
            "handedness IS NULL OR handedness IN ('right', 'left', 'ambidextrous')",
            name="ck_tournament_registrations_handedness",
        ),
        CheckConstraint(
            "previous_tournament_count >= 0",
            name="ck_tournament_registrations_prior_count",
        ),
        CheckConstraint(
            "hema_experience_description IS NOT NULL OR hema_started_year IS NOT NULL",
            name="ck_tournament_registrations_hema_experience",
        ),
        Index("ix_tournament_registrations_tournament_id", "tournament_id"),
        Index(
            "uq_tournament_registrations_active_user",
            "tournament_id",
            "user_id",
            unique=True,
            postgresql_where=text("registration_status <> 'cancelled'"),
            sqlite_where=text("registration_status <> 'cancelled'"),
        ),
        Index(
            "uq_tournament_registrations_active_email",
            "tournament_id",
            "email_normalized",
            unique=True,
            postgresql_where=text("registration_status <> 'cancelled'"),
            sqlite_where=text("registration_status <> 'cancelled'"),
        ),
        Index(
            "uq_tournament_registrations_active_document",
            "tournament_id",
            "identity_document_number_normalized",
            unique=True,
            postgresql_where=text("registration_status <> 'cancelled'"),
            sqlite_where=text("registration_status <> 'cancelled'"),
        ),
        {"schema": "public"},
    )

    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournaments.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=text("'awaiting_payment'")
    )

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    social_name: Mapped[str | None] = mapped_column(String(200))
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    identity_document_type: Mapped[str] = mapped_column(String(10), nullable=False)
    identity_document_number: Mapped[str] = mapped_column(String(100), nullable=False)
    identity_document_number_normalized: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    email_normalized: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    city: Mapped[str] = mapped_column(String(150), nullable=False)
    state_or_province: Mapped[str | None] = mapped_column(String(150))
    country: Mapped[str] = mapped_column(String(150), nullable=False)

    school_or_team_name: Mapped[str | None] = mapped_column(String(200))
    instructor_name: Mapped[str | None] = mapped_column(String(200))
    hema_experience_description: Mapped[str | None] = mapped_column(String(100))
    hema_started_year: Mapped[int | None] = mapped_column(Integer)
    previous_tournament_count: Mapped[int] = mapped_column(Integer, nullable=False)
    hema_ratings_reference: Mapped[str | None] = mapped_column(String(300))
    handedness: Mapped[str | None] = mapped_column(String(16))
    category_or_eligibility_note: Mapped[str | None] = mapped_column(Text)

    emergency_contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    emergency_contact_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    staff_safety_note: Mapped[str | None] = mapped_column(Text)


    tournament: Mapped[Tournament] = relationship(back_populates="registrations")
    documents: Mapped[list["TournamentRegistrationDocument"]] = relationship(
        back_populates="registration"
    )

    acceptances: Mapped[list["RegistrationAcceptance"]] = relationship(
        back_populates="registration",
        order_by="RegistrationAcceptance.id",
        lazy="selectin",
    )
