"""A registration's approved proof and its verified shared payment."""

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel
from app.payments.models import Payment
from .payment_proof_review import PaymentProofReview
from .tournament_registration import TournamentRegistration


class RegistrationPayment(BaseModel):
    __tablename__ = "registration_payments"
    __table_args__ = (
        UniqueConstraint(
            "registration_id", name="uq_registration_payments_registration"
        ),
        UniqueConstraint("proof_review_id", name="uq_registration_payments_review"),
        UniqueConstraint("payment_id", name="uq_registration_payments_payment"),
        {"schema": "public"},
    )
    registration_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_registrations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    proof_review_id: Mapped[int] = mapped_column(
        ForeignKey("public.payment_proof_reviews.id", ondelete="RESTRICT"),
        nullable=False,
    )
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("public.payments.id", ondelete="RESTRICT"), nullable=False
    )

    registration: Mapped[TournamentRegistration] = relationship()
    proof_review: Mapped[PaymentProofReview] = relationship()
    payment: Mapped[Payment] = relationship()
