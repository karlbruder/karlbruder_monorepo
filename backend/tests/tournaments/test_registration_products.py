"""Registration uses the selected tournament product and records agreed terms."""

from decimal import Decimal

import pytest

from app.karlmart.catalog.models import Price, Product
from app.karlmart.orders.models import Order, OrderItem
from app.tournaments.models import TournamentProduct, TournamentRegistration
from tests.tournaments.test_tournament_registrations import (
    _create_event,
    _headers,
    _post_registration,
    _registration,
    setup as registration_setup,
)


@pytest.fixture(name="setup")
def product_registration_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def test_registration_snapshots_the_selected_product_and_price(setup):
    client, key, session, _ = setup
    tournament_id = _create_event(client, key)
    product = Product(name="Plena", description="Entry and prizes")
    session.add(product)
    session.flush()
    price = Price(product_id=product.id, amount=Decimal("100.00"))
    offering = TournamentProduct(tournament_id=tournament_id, product_id=product.id)
    session.add_all([price, offering])
    session.flush()
    headers = _headers(key)
    response = _post_registration(client, tournament_id, headers, _registration(
        tournament_product_id=offering.id, price_id=price.id,
    ))
    assert response.status_code == 201, response.text
    registration = session.query(TournamentRegistration).filter_by(
        registration_number=response.json()["registration_number"]
    ).one()
    item = session.get(OrderItem, registration.order_item_id)
    order = session.get(Order, item.order_id)
    assert registration.tournament_product_id == offering.id
    assert order.user_id == registration.user_id
    assert item.product_name == "Plena"
    assert item.product_description == "Entry and prizes"
    assert item.unit_amount == Decimal("100.00")
    product.name = "Changed product"
    product.description = "Changed benefits"
    session.flush()
    detail = client.get(
        f"/api/tournaments/{tournament_id}/registrations/{registration.registration_number}",
        headers=headers,
    )
    assert detail.status_code == 200
    assert detail.json()["product_name"] == "Plena"
    assert detail.json()["product_description"] == "Entry and prizes"


def test_registration_rejects_a_product_from_another_tournament(setup):
    client, key, session, _ = setup
    tournament_id = _create_event(client, key)
    other_tournament_id = _create_event(client, key)
    product = Product(name="Other event", description="Entry")
    session.add(product)
    session.flush()
    price = Price(product_id=product.id, amount=Decimal("100.00"))
    offering = TournamentProduct(tournament_id=other_tournament_id, product_id=product.id)
    session.add_all([price, offering])
    session.flush()
    response = _post_registration(client, tournament_id, _headers(key), _registration(
        tournament_product_id=offering.id, price_id=price.id,
    ))
    assert response.status_code == 400
    assert session.query(Order).count() == 0
