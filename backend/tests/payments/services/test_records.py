"""Financial facts are independent of tournament registration and membership policy."""

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.payments.models import Payment, Refund
from app.payments.services.records import add_payment_record, add_refund_record

NOW = datetime(2026, 11, 4, 12, tzinfo=timezone.utc)


def test_shared_payment_and_partial_refund_need_no_domain_association(db_session):
    payment = add_payment_record(
        db_session,
        amount_received=Decimal("100.00"),
        verified_by_user_id=uuid4(),
        verified_at=NOW,
    )
    refund = add_refund_record(
        db_session,
        payment_id=payment.id,
        amount_owed=Decimal("25.00"),
        obligated_at=NOW,
    )
    db_session.expire_all()
    assert payment.amount_received == Decimal("100.00")
    assert refund.amount_owed == Decimal("25.00")
    assert refund.refund_status == "awaiting_refund"
    assert refund.payment_id == payment.id
    assert "registration_id" not in Payment.__table__.columns
    assert "due_on" not in Refund.__table__.columns


def test_caller_rollback_removes_shared_payment_and_refund_together(db_session):
    with pytest.raises(RuntimeError, match="Rollback fixture"):
        with db_session.begin_nested():
            payment = add_payment_record(
                db_session,
                amount_received=Decimal("0.00"),
                verified_by_user_id=uuid4(),
                verified_at=NOW,
            )
            add_refund_record(
                db_session,
                payment_id=payment.id,
                amount_owed=Decimal("0.00"),
                obligated_at=NOW,
            )
            raise RuntimeError("Rollback fixture")
    assert db_session.scalar(select(func.count()).select_from(Payment)) == 0
    assert db_session.scalar(select(func.count()).select_from(Refund)) == 0


@pytest.mark.parametrize(
    "column,value",
    [
        ("amount_owed", "1"),
        ("payment_id", "-1"),
        ("obligated_at", "'2025-01-01T00:00:00Z'"),
    ],
)
def test_recorded_refund_source_amount_and_obligation_time_cannot_change(
    db_session, column, value
):
    payment = add_payment_record(
        db_session,
        amount_received=Decimal("100.00"),
        verified_by_user_id=uuid4(),
        verified_at=NOW,
    )
    add_refund_record(
        db_session,
        payment_id=payment.id,
        amount_owed=Decimal("25.00"),
        obligated_at=NOW,
    )
    with pytest.raises(IntegrityError, match="immutable"):
        with db_session.begin_nested():
            db_session.execute(text(f"UPDATE public.refunds SET {column}={value}"))
