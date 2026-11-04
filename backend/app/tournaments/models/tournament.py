"""Tournament catalog row."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.tournaments.models.tournament_registration import TournamentRegistration


class Tournament(Base):
    __tablename__ = "tournaments"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_tournaments_slug"),
        CheckConstraint(
            "competitor_capacity IS NULL OR competitor_capacity >= 0",
            name="ck_tournaments_capacity_nonnegative",
        ),
        CheckConstraint(
            "registration_fee_amount IS NULL OR registration_fee_amount >= 0",
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
            "next_registration_number BETWEEN 1 AND 1000000",
            name="ck_tournaments_next_serial_range",
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    discipline: Mapped[str | None] = mapped_column(String(80))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_internal: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    competitor_capacity: Mapped[int | None] = mapped_column(Integer)
    registration_opens_on: Mapped[date | None] = mapped_column(Date)
    registration_closes_on: Mapped[date | None] = mapped_column(Date)
    is_registration_closed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    payment_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    registration_fee_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    location: Mapped[str | None] = mapped_column(String(300))
    schedule: Mapped[str | None] = mapped_column(Text)
    rules_text: Mapped[str | None] = mapped_column(Text)
    rules_url: Mapped[str | None] = mapped_column(Text)
    rules_version: Mapped[str | None] = mapped_column(String(100))
    terms_version: Mapped[str | None] = mapped_column(String(100))
    equipment_requirements: Mapped[str | None] = mapped_column(Text)
    cancellation_policy_text: Mapped[str | None] = mapped_column(Text)
    cancellation_policy_url: Mapped[str | None] = mapped_column(Text)
    next_registration_number: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    registrations: Mapped[list["TournamentRegistration"]] = relationship(
        back_populates="tournament"
    )
