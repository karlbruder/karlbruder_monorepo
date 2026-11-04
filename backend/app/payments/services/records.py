"""Persist financial facts inside the caller's authorized domain transaction."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session
from app.payments.models import Payment, Refund


def add_payment_record(
    session: Session,
    *,
    amount_received: Decimal,
    verified_by_user_id: UUID,
    verified_at: datetime
) -> Payment:
    payment = Payment(
        amount_received=amount_received,
        verified_by_user_id=verified_by_user_id,
        verified_at=verified_at,
    )
    session.add(payment)
    session.flush()
    return payment


def add_refund_record(
    session: Session, *, payment_id: int, amount_owed: Decimal, obligated_at: datetime
) -> Refund:
    refund = Refund(
        payment_id=payment_id, amount_owed=amount_owed, obligated_at=obligated_at
    )
    session.add(refund)
    session.flush()
    return refund
