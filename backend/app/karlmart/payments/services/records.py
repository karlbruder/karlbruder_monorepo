"""Persist financial facts inside the caller's authorized domain transaction."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session
from app.karlmart.payments.models import Payment, Refund


def add_payment_record(
    session: Session,
    *,
    amount_received: Decimal,
    verified_by_user_id: UUID,
    verified_at: datetime,
    order_id: int,
) -> Payment:
    payment = Payment(
        order_id=order_id,
        amount_received=amount_received,
        verified_by_user_id=verified_by_user_id,
        verified_at=verified_at,
    )
    session.add(payment)
    session.flush()
    return payment


def add_refund_record(
    session: Session, *, payment_id: int, amount_owed: Decimal, obligated_at: datetime,
    due_on: date,
) -> Refund:
    refund = Refund(
        payment_id=payment_id, amount_owed=amount_owed, obligated_at=obligated_at,
        due_on=due_on,
    )
    session.add(refund)
    session.flush()
    return refund
