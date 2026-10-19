"""SQLAlchemy models for tournament data in PostgreSQL public."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Tournament(Base):
    __tablename__ = "tournaments"
    __table_args__ = (
        CheckConstraint(
            "max_competitor_capacity IS NULL OR max_competitor_capacity >= 0",
            name="ck_tournaments_capacity_nonnegative",
        ),
        CheckConstraint(
            "inscription_fee_amount IS NULL OR inscription_fee_amount >= 0",
            name="ck_tournaments_fee_nonnegative",
        ),
        CheckConstraint(
            "registration_opens_on IS NULL OR registration_closes_on IS NULL "
            "OR registration_opens_on <= registration_closes_on",
            name="ck_tournaments_registration_window_order",
        ),
        CheckConstraint(
            "ends_at IS NULL OR ends_at >= starts_at",
            name="ck_tournaments_event_dates_order",
        ),
        CheckConstraint(
            "next_inscription_serial BETWEEN 1 AND 1000000",
            name="ck_tournaments_next_serial_range",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    modality: Mapped[str | None] = mapped_column(String(80))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    max_competitor_capacity: Mapped[int | None] = mapped_column(Integer)
    registration_opens_on: Mapped[date | None] = mapped_column(Date)
    registration_closes_on: Mapped[date | None] = mapped_column(Date)
    new_registrations_closed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    payment_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    inscription_fee_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    location: Mapped[str | None] = mapped_column(String(300))
    schedule: Mapped[str | None] = mapped_column(Text)
    regulation: Mapped[str | None] = mapped_column(Text)
    regulation_version: Mapped[str | None] = mapped_column(String(100))
    terms_version: Mapped[str | None] = mapped_column(String(100))
    equipment_requirements: Mapped[str | None] = mapped_column(Text)
    cancellation_policy: Mapped[str | None] = mapped_column(Text)
    next_inscription_serial: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    signups: Mapped[list["TournamentSignup"]] = relationship(back_populates="tournament")


class TournamentSignup(Base):
    __tablename__ = "tournament_signups"
    __table_args__ = (
        UniqueConstraint("inscription_number", name="uq_tournament_signups_inscription_number"),
        CheckConstraint(
            "status IN ('awaiting_payment', 'payment_in_review', 'confirmed', 'waitlist', 'cancelled')",
            name="ck_tournament_signups_status",
        ),
        CheckConstraint(
            "document_type IN ('cpf', 'passport')", name="ck_tournament_signups_document_type"
        ),
        CheckConstraint(
            "handedness IS NULL OR handedness IN ('right', 'left', 'ambidextrous')",
            name="ck_tournament_signups_handedness",
        ),
        CheckConstraint(
            "prior_tournaments_count >= 0", name="ck_tournament_signups_prior_count"
        ),
        CheckConstraint(
            "hema_practice_duration IS NOT NULL OR hema_practice_start_year IS NOT NULL",
            name="ck_tournament_signups_hema_experience",
        ),
        CheckConstraint(
            "declares_required_equipment AND declares_physically_fit "
            "AND accepts_regulation AND accepts_data_processing "
            "AND acknowledges_inherent_risks AND accepts_cancellation_policy",
            name="ck_tournament_signups_required_declarations",
        ),
        Index("ix_tournament_signups_tournament_id", "tournament_id"),
        Index(
            "uq_tournament_signups_active_user",
            "tournament_id",
            "user_id",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
            sqlite_where=text("status <> 'cancelled'"),
        ),
        Index(
            "uq_tournament_signups_active_email",
            "tournament_id",
            "email_normalized",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
            sqlite_where=text("status <> 'cancelled'"),
        ),
        Index(
            "uq_tournament_signups_active_document",
            "tournament_id",
            "document_id_normalized",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
            sqlite_where=text("status <> 'cancelled'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("tournaments.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    inscription_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=text("'awaiting_payment'")
    )

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    social_name: Mapped[str | None] = mapped_column(String(200))
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    document_type: Mapped[str] = mapped_column(String(10), nullable=False)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    document_id_normalized: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    email_normalized: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    city: Mapped[str] = mapped_column(String(150), nullable=False)
    state: Mapped[str | None] = mapped_column(String(150))
    country: Mapped[str] = mapped_column(String(150), nullable=False)

    school_name: Mapped[str | None] = mapped_column(String(200))
    responsible_instructor_name: Mapped[str | None] = mapped_column(String(200))
    hema_practice_duration: Mapped[str | None] = mapped_column(String(100))
    hema_practice_start_year: Mapped[int | None] = mapped_column(Integer)
    prior_tournaments_count: Mapped[int] = mapped_column(Integer, nullable=False)
    hema_ratings_ref: Mapped[str | None] = mapped_column(String(300))
    handedness: Mapped[str | None] = mapped_column(String(16))
    special_category_note: Mapped[str | None] = mapped_column(Text)

    emergency_contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    emergency_contact_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    declares_required_equipment: Mapped[bool] = mapped_column(Boolean, nullable=False)
    declares_physically_fit: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepts_regulation: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepts_data_processing: Mapped[bool] = mapped_column(Boolean, nullable=False)
    acknowledges_inherent_risks: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepts_cancellation_policy: Mapped[bool] = mapped_column(Boolean, nullable=False)
    image_use_authorized: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accepted_terms_version: Mapped[str] = mapped_column(String(100), nullable=False)
    accepted_regulation_version: Mapped[str] = mapped_column(String(100), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    acceptance_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    safety_note: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    tournament: Mapped[Tournament] = relationship(back_populates="signups")
