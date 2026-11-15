from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.karlmart.catalog.models import Price, Product
from app.karlmart.orders.models import Order, OrderItem


def test_order_item_preserves_product_and_price_snapshot(db_session):
    product = Product(name="Entry", description="Tournament entry")
    order = Order(user_id=uuid4(), status="pending")
    db_session.add_all([product, order])
    db_session.flush()
    price = Price(product_id=product.id, amount=Decimal("200.00"))
    db_session.add(price)
    db_session.flush()
    item = OrderItem(order_id=order.id, price_id=price.id, product_name=product.name,
                     product_description=product.description, unit_amount=price.amount)
    db_session.add(item)
    db_session.flush()
    product.name = "Updated entry"
    product.description = "Updated description"
    db_session.flush()
    db_session.refresh(item)
    assert item.product_name == "Entry"
    assert item.product_description == "Tournament entry"
    assert item.unit_amount == Decimal("200.00")


@pytest.mark.parametrize("amount", [Decimal("-1"), Decimal("NaN")])
def test_price_rejects_negative_and_nan_amounts(db_session, amount):
    product = Product(name="Entry", description="Tournament entry")
    db_session.add(product)
    db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(Price(product_id=product.id, amount=amount))
        db_session.flush()


def test_payment_and_refund_can_reference_order_and_deadline(db_session):
    from datetime import date, datetime, timezone

    from app.karlmart.payments.models import Payment, Refund

    order = Order(user_id=uuid4(), status="pending")
    db_session.add(order)
    db_session.flush()
    now = datetime.now(timezone.utc)
    payment = Payment(
        order_id=order.id,
        amount_received=Decimal("200.00"),
        verified_by_user_id=uuid4(),
        verified_at=now,
    )
    db_session.add(payment)
    db_session.flush()
    refund = Refund(
        payment_id=payment.id,
        amount_owed=payment.amount_received,
        obligated_at=now,
        due_on=date(2026, 12, 1),
    )
    db_session.add(refund)
    db_session.flush()
    db_session.refresh(refund)
    assert payment.order_id == order.id
    assert refund.payment_id == payment.id
    assert refund.due_on == date(2026, 12, 1)


def test_purchased_price_terms_cannot_change_but_price_can_be_deactivated(db_session):
    product = Product(name="Entry", description="Tournament entry")
    order = Order(user_id=uuid4(), status="pending")
    db_session.add_all([product, order])
    db_session.flush()
    price = Price(product_id=product.id, amount=Decimal("100.00"))
    db_session.add(price)
    db_session.flush()
    db_session.add(OrderItem(
        order_id=order.id, price_id=price.id, product_name=product.name,
        product_description=product.description, unit_amount=price.amount,
    ))
    db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        price.amount = Decimal("200.00")
        db_session.flush()
    db_session.refresh(price)
    price.is_active = False
    db_session.flush()
    assert price.amount == Decimal("100.00")
    assert not price.is_active


def test_order_owner_cannot_change_while_status_can_change(db_session):
    owner = uuid4()
    order = Order(user_id=owner, status="pending")
    db_session.add(order)
    db_session.flush()
    with pytest.raises(IntegrityError, match="Order owner is immutable"), db_session.begin_nested():
        order.user_id = uuid4()
        db_session.flush()
    db_session.refresh(order)
    order.status = "paid"
    db_session.flush()
    assert order.user_id == owner
    assert order.status == "paid"
