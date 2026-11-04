"""A refund obligation and separately recorded evidence of its completion."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from .registration_payment import RegistrationPayment


class RegistrationRefund(Base):
    __tablename__ = "registration_refunds"
    __table_args__ = (
        UniqueConstraint("payment_id", name="uq_registration_refunds_payment"),
        CheckConstraint(
            "amount_owed >= 0 AND amount_owed <> 'NaN'::numeric",
            name="ck_registration_refunds_amount_nonnegative",
        ),
        CheckConstraint(
            "refund_status IN ('awaiting_refund', 'completed')",
            name="ck_registration_refunds_status",
        ),
        CheckConstraint(
            "(refund_status = 'awaiting_refund' AND completed_at IS NULL AND completed_by_user_id IS NULL) OR (refund_status = 'completed' AND completed_at IS NOT NULL AND completed_by_user_id IS NOT NULL)",
            name="ck_registration_refunds_completion_evidence",
        ),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= obligated_at",
            name="ck_registration_refunds_completion_order",
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("public.registration_payments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount_owed: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    refund_status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=text("'awaiting_refund'")
    )
    obligated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    due_on: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_by_user_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))

    payment: Mapped[RegistrationPayment] = relationship()
