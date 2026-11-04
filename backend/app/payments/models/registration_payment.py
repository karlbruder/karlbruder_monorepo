"""The actual BRL amount staff verified as received for a registration."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


if TYPE_CHECKING:
    from .payment_proof_review import PaymentProofReview
    from app.tournaments.models.tournament_registration import TournamentRegistration


class RegistrationPayment(Base):
    __tablename__ = "registration_payments"
    __table_args__ = (
        CheckConstraint(
            "amount_received >= 0 AND amount_received <> 'NaN'::numeric",
            name="ck_registration_payments_amount_nonnegative",
        ),
        UniqueConstraint("proof_review_id", name="uq_registration_payments_review"),
        UniqueConstraint(
            "registration_id", name="uq_registration_payments_registration"
        ),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    registration_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_registrations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    proof_review_id: Mapped[int] = mapped_column(
        ForeignKey("public.payment_proof_reviews.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount_received: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    verified_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    registration: Mapped["TournamentRegistration"] = relationship()
    proof_review: Mapped["PaymentProofReview"] = relationship()
