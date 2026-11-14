"""Link an approved tournament proof review to its verified payment."""

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel
from app.karlmart.payments.models import Payment
from .payment_proof_review import PaymentProofReview


class PaymentProofPayment(BaseModel):
    __tablename__ = "payment_proof_payments"
    __table_args__ = (
        UniqueConstraint("proof_review_id", name="uq_payment_proof_payments_review"),
        UniqueConstraint("payment_id", name="uq_payment_proof_payments_payment"),
        {"schema": "public"},
    )

    proof_review_id: Mapped[int] = mapped_column(
        ForeignKey("public.payment_proof_reviews.id", ondelete="RESTRICT"), nullable=False
    )
    payment_id: Mapped[int] = mapped_column(
        ForeignKey("public.payments.id", ondelete="RESTRICT"), nullable=False
    )
    proof_review: Mapped[PaymentProofReview] = relationship()
    payment: Mapped[Payment] = relationship()
