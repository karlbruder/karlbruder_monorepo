"""A verified BRL receipt, independent of the domain that uses it."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Integer,
    Numeric,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "amount_received >= 0 AND amount_received <> 'NaN'::numeric",
            name="ck_payments_amount_nonnegative",
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    amount_received: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    verified_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
