"""A tournament refund obligation linked to its shared financial record."""

from datetime import date
from sqlalchemy import Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.payments.models import Refund
from .registration_payment import RegistrationPayment


class RegistrationRefund(Base):
    __tablename__ = "registration_refunds"
    __table_args__ = (
        UniqueConstraint(
            "registration_payment_id",
            name="uq_registration_refunds_registration_payment",
        ),
        UniqueConstraint("refund_id", name="uq_registration_refunds_refund"),
        {"schema": "public"},
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    registration_payment_id: Mapped[int] = mapped_column(
        ForeignKey("public.registration_payments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    refund_id: Mapped[int] = mapped_column(
        ForeignKey("public.refunds.id", ondelete="RESTRICT"), nullable=False
    )
    due_on: Mapped[date] = mapped_column(Date, nullable=False)

    registration_payment: Mapped[RegistrationPayment] = relationship()
    refund: Mapped[Refund] = relationship()
