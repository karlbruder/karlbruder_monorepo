"""An attributable decision about one exact submitted payment proof."""

from typing import TYPE_CHECKING
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db.base import BaseModel


if TYPE_CHECKING:
    from app.tournaments.models.tournament_registration_document import (
        TournamentRegistrationDocument,
    )


class PaymentProofReview(BaseModel):
    __tablename__ = "payment_proof_reviews"
    __table_args__ = (
        CheckConstraint(
            "decision IN ('approved', 'rejected')",
            name="ck_payment_proof_reviews_decision",
        ),
        CheckConstraint(
            "decision <> 'rejected' OR (rejection_reason IS NOT NULL AND rejection_reason ~ '[^[:space:]]')",
            name="ck_payment_proof_reviews_rejection_reason",
        ),
        {"schema": "public"},
    )

    document_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournament_registration_documents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(String(16), nullable=False)
    reviewed_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    document: Mapped["TournamentRegistrationDocument"] = relationship()
