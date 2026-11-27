"""Shared catalog products remain independent of tournament associations."""

from decimal import Decimal

import pytest

from app.karlmart.catalog.models import Price, Product
from tests.tournaments.test_tournament_registrations import (
    _headers,
    setup as registration_setup,
)


@pytest.fixture(name="setup")
def catalog_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def test_shared_catalog_includes_unattached_products_without_tournament_data(setup):
    client, key, session, _ = setup
    admin = _headers(key, role='admin')
    product = Product(name='Unattached', description='Catalog example')
    session.add(product)
    session.flush()
    session.add(Price(product_id=product.id, amount=Decimal('12.00')))
    session.flush()
    catalog = client.get('/api/staff/products', headers=admin)
    assert catalog.status_code == 200
    entry = next(item for item in catalog.json() if item['id'] == product.id)
    assert entry['name'] == 'Unattached'
    assert entry['amount'] == '12.00'
    assert 'tournaments' not in entry
    uses = client.get('/api/staff/tournaments/products', headers=admin)
    assert next(item for item in uses.json() if item['id'] == product.id)['tournaments'] == []
    changed = client.patch(f'/api/staff/products/{product.id}', headers=admin, json={'name': 'Changed', 'description': 'Shared catalog'})
    assert changed.status_code == 200
    assert changed.json()['name'] == 'Changed'

