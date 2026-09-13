from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Sequence,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


INSCRIPTION_NUMBER_SEQUENCE = Sequence(
    "tournament_signup_inscription_seq",
    schema="public",
)


class Tournament(Base):
    __tablename__ = "tournaments"
    __table_args__ = (
        CheckConstraint(
            "ends_at IS NULL OR ends_at >= starts_at",
            name="ck_tournaments_ends_at_after_starts_at",
        ),
        CheckConstraint(
            "registration_opens_at IS NULL "
            "OR registration_closes_at IS NULL "
            "OR registration_closes_at >= registration_opens_at",
            name="ck_tournaments_registration_window",
        ),
        CheckConstraint(
            "max_competitor_capacity IS NULL "
            "OR max_competitor_capacity >= 0",
            name="ck_tournaments_nonnegative_capacity",
        ),
        CheckConstraint(
            "inscription_fee_amount IS NULL OR inscription_fee_amount >= 0",
            name="ck_tournaments_nonnegative_fee",
        ),
        CheckConstraint(
            "cancellation_reason IS NULL OR cancelled_at IS NOT NULL",
            name="ck_tournaments_cancellation_reason_requires_date",
        ),
        CheckConstraint(
            "status IN ('draft', 'published', 'cancelled', 'archived')",
            name="ck_tournaments_status",
        ),
        CheckConstraint(
            "status <> 'published' OR published_at IS NOT NULL",
            name="ck_tournaments_published_status_requires_date",
        ),
        CheckConstraint(
            "status <> 'cancelled' OR cancelled_at IS NOT NULL",
            name="ck_tournaments_cancelled_status_requires_date",
        ),
        CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name="ck_tournaments_archived_status_requires_date",
        ),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    modality: Mapped[str | None] = mapped_column(String(100))
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_internal: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    max_competitor_capacity: Mapped[int | None] = mapped_column(Integer)
    registration_opens_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    registration_closes_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    payment_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    inscription_fee_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    location: Mapped[str | None] = mapped_column(Text)
    schedule: Mapped[str | None] = mapped_column(Text)
    regulation: Mapped[str | None] = mapped_column(Text)
    equipment_requirements: Mapped[str | None] = mapped_column(Text)
    cancellation_policy: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="draft",
        server_default=text("'draft'"),
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Deliberately no delete cascade: cancelling or removing a tournament must not
    # mutate the status or delete any of its signups.
    signups: Mapped[list["TournamentSignup"]] = relationship(
        back_populates="tournament",
        passive_deletes="all",
    )


class TournamentSignup(Base):
    __tablename__ = "tournament_signups"
    __table_args__ = (
        CheckConstraint(
            "status IN "
            "('awaiting_payment', 'payment_in_review', 'confirmed', "
            "'waitlist', 'cancelled')",
            name="ck_tournament_signups_status",
        ),
        CheckConstraint(
            "hema_practice_start_year IS NULL OR hema_practice_start_year > 0",
            name="ck_tournament_signups_positive_practice_start_year",
        ),
        CheckConstraint(
            "prior_tournaments_count IS NULL OR prior_tournaments_count >= 0",
            name="ck_tournament_signups_nonnegative_prior_tournaments",
        ),
        UniqueConstraint(
            "inscription_number",
            name="uq_tournament_signups_inscription_number",
        ),
        UniqueConstraint(
            "tournament_id",
            "email",
            name="uq_tournament_signups_tournament_email",
        ),
        UniqueConstraint(
            "tournament_id",
            "document_issuing_country",
            "document_type",
            "document_id",
            name="uq_tournament_signups_tournament_document",
        ),
        UniqueConstraint(
            "tournament_id",
            "user_id",
            name="uq_tournament_signups_tournament_user",
        ),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    tournament_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "public.tournaments.id",
            name="fk_tournament_signups_tournament_id_tournaments",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )
    # Supabase Auth may use a different database, so this has no database FK.
    user_id: Mapped[UUID] = mapped_column(Uuid, nullable=False, index=True)
    inscription_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="awaiting_payment",
        server_default=text("'awaiting_payment'"),
    )

    # TODO 1
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    social_name: Mapped[str | None] = mapped_column(String(255))
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    document_type: Mapped[str] = mapped_column(String(32), nullable=False)
    document_issuing_country: Mapped[str] = mapped_column(String(2), nullable=False)
    document_id: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(120), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False)

    school_name: Mapped[str] = mapped_column(String(255), nullable=False)
    responsible_instructor_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    hema_practice_duration: Mapped[str | None] = mapped_column(String(100))
    hema_practice_start_year: Mapped[int | None] = mapped_column(Integer)
    prior_tournaments_count: Mapped[int | None] = mapped_column(Integer)
    hema_ratings_ref: Mapped[str | None] = mapped_column(String(255))
    special_category_note: Mapped[str | None] = mapped_column(Text)

    emergency_contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    emergency_contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    declares_required_equipment: Mapped[bool] = mapped_column(Boolean, nullable=False)
    declares_physically_fit: Mapped[bool] = mapped_column(Boolean, nullable=False)
    safety_note: Mapped[str | None] = mapped_column(Text)
    show_on_public_list: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    tournament: Mapped[Tournament] = relationship(back_populates="signups")
