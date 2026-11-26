"""Staff configure shared registration offerings without changing past purchases."""

from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.karlmart.catalog.models import Price, Product
from app.karlmart.orders.models import OrderItem
from app.tournaments.models import Tournament, TournamentProduct, TournamentRegistration
from tests.tournaments.test_tournament_registrations import (
    _create_event, _event, _headers, _post_registration, _registration,
    setup as registration_setup,
)


@pytest.fixture(name="setup")
def offerings_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def test_shared_offerings_preserve_purchase_terms_and_control_availability(setup):
    client, key, session, _ = setup
    admin = _headers(key, role="admin")
    payload = _event(new_products=[{"name": "Plena", "description": "Entry and prizes", "amount": "100.00"},
                                   {"name": "Social", "description": "Entry", "amount": "0"}])
    response = client.post('/api/staff/tournaments', headers=admin, json=payload)
    assert response.status_code == 201, response.text
    first = response.json()['id']
    options = client.get(f'/api/staff/tournaments/{first}/products', headers=admin).json()
    product = options[0]
    second_response = client.post('/api/staff/tournaments', headers=admin, json=_event(existing_product_ids=[product['id']]))
    assert second_response.status_code == 201, second_response.text
    second = second_response.json()['id']
    link = session.scalar(select(TournamentProduct).where(TournamentProduct.tournament_id == first, TournamentProduct.product_id == product['id']))
    registration = _post_registration(client, first, _headers(key), _registration(tournament_product_id=link.id, price_id=product['price_id']))
    assert registration.status_code == 201, registration.text
    stored = session.scalar(select(TournamentRegistration).where(TournamentRegistration.registration_number == registration.json()['registration_number']))
    item_id = stored.order_item_id
    edit = client.patch(f"/api/staff/products/{product['id']}", headers=admin, json={'name': 'Updated', 'description': 'New benefits'})
    assert edit.status_code == 200, edit.text
    product_uses = client.get('/api/staff/tournaments/products', headers=admin).json()
    shared = next(row for row in product_uses if row['id'] == product['id'])
    assert {row['id'] for row in shared['tournaments']} == {first, second}
    assert 'tournaments' not in edit.json()
    price = client.post(f"/api/staff/products/{product['id']}/prices", headers=admin, json={'amount': '125.00'})
    assert price.status_code == 201, price.text
    assert price.json()['price_id'] != product['price_id']
    old_price = session.get(Price, product['price_id'])
    item = session.get(OrderItem, item_id)
    assert (old_price.amount, item.product_name, item.product_description, item.unit_amount) == (Decimal('100.00'), 'Plena', 'Entry and prizes', Decimal('100.00'))
    staff_rows = client.get(f'/api/staff/tournaments/{first}/registrations', headers=admin).json()
    assert staff_rows[0]['product_name'] == 'Plena'
    stale = _post_registration(client, second, _headers(key, email='second@example.test'), _registration(email='second@example.test', document='SECOND', tournament_product_id=session.scalar(select(TournamentProduct.id).where(TournamentProduct.tournament_id == second)), price_id=product['price_id']))
    assert stale.status_code == 400
    for tournament in (first, second):
        offered = client.get(f'/api/tournaments/{tournament}/products').json()
        assert any(row['name'] == 'Updated' and row['price_id'] == price.json()['price_id'] for row in offered)
    assert client.post(f"/api/staff/products/{product['id']}/deactivate", headers=admin).status_code == 200
    for tournament in (first, second):
        assert all(row['product_id'] != product['id'] for row in client.get(f'/api/tournaments/{tournament}/products').json())
    assert client.get(f'/api/staff/tournaments/{first}/registrations', headers=admin).json()[0]['product_name'] == 'Plena'


def test_invalid_offerings_roll_back_tournament_and_catalog(setup):
    client, key, session, _ = setup
    admin = _headers(key, role='admin')
    before = session.scalar(select(func.count()).select_from(Tournament))
    result = client.post('/api/staff/tournaments', headers=admin, json=_event(existing_product_ids=[999999], new_products=[{'name': 'Draft', 'description': 'Entry', 'amount': '10'}]))
    assert result.status_code == 404
    assert session.scalar(select(func.count()).select_from(Tournament)) == before
    assert session.scalar(select(Product.id).where(Product.name == 'Draft')) is None
    for amount in ('-1', '0.001', 'NaN', '10000000000.00'):
        response = client.post('/api/staff/tournaments', headers=admin, json=_event(new_products=[{'name': 'Draft', 'description': 'Entry', 'amount': amount}]))
        assert response.status_code == 422


@pytest.mark.parametrize('method,path,payload', [
    ('get', '/api/staff/products', None),
    ('get', '/api/staff/tournaments/products', None),
    ('patch', '/api/staff/products/1', {'name': 'Entry', 'description': 'Entry'}),
    ('post', '/api/staff/products/1/prices', {'amount': '10'}),
    ('post', '/api/staff/products/1/deactivate', None),
    ('get', '/api/staff/tournaments/1/products', None),
    ('post', '/api/staff/tournaments/1/products', {}),
    ('get', '/api/staff/tournaments/1/registration-totals', None),
])
def test_staff_offering_routes_reject_guests_and_non_admins(setup, method, path, payload):
    client, key, _, _ = setup
    kwargs = {'json': payload} if payload is not None else {}
    assert client.request(method, path, **kwargs).status_code == 401
    for role in ('regular_user', 'guild_member'):
        assert client.request(method, path, headers=_headers(key, role=role), **kwargs).status_code == 403


def test_registration_totals_are_scoped_and_count_confirmed_only(setup):
    client, key, session, _ = setup
    admin = _headers(key, role='admin')
    first = _create_event(client, key, competitor_capacity=0)
    second = _create_event(client, key)
    assert client.get(f'/api/staff/tournaments/{first}/registration-totals', headers=admin).json() == {'total': 0, 'confirmed_count': 0, 'competitor_capacity': 0}
    response = _post_registration(client, first, _headers(key))
    assert response.status_code == 201
    stored = session.scalar(select(TournamentRegistration).where(TournamentRegistration.tournament_id == first))
    stored.registration_status = 'cancelled'
    session.flush()
    assert client.get(f'/api/staff/tournaments/{first}/registration-totals', headers=admin).json() == {'total': 1, 'confirmed_count': 0, 'competitor_capacity': 0}
    assert client.get(f'/api/staff/tournaments/{second}/registration-totals', headers=admin).json() == {'total': 0, 'confirmed_count': 0, 'competitor_capacity': None}
    second_registration = _post_registration(client, first, _headers(key, email='other@example.test'), _registration(email='other@example.test', document='OTHER'))
    assert second_registration.status_code == 201
    confirmed = session.scalar(select(TournamentRegistration).where(TournamentRegistration.registration_number == second_registration.json()['registration_number']))
    confirmed.registration_status = 'confirmed'
    session.get(Tournament, first).competitor_capacity = 4
    session.flush()
    assert client.get(f'/api/staff/tournaments/{first}/registration-totals', headers=admin).json() == {'total': 2, 'confirmed_count': 1, 'competitor_capacity': 4}


def test_existing_tournament_attachment_is_atomic_and_rejects_duplicates(setup):
    client, key, session, _ = setup
    admin = _headers(key, role='admin')
    first = _create_event(client, key)
    second = _create_event(client, key)
    created = client.post(f'/api/staff/tournaments/{first}/products', headers=admin, json={'new_products': [{'name': 'Shared', 'description': 'Entry', 'amount': '5.00'}]})
    assert created.status_code == 200
    product_id = created.json()[0]['id']
    attached = client.post(f'/api/staff/tournaments/{second}/products', headers=admin, json={'existing_product_ids': [product_id], 'new_products': [{'name': 'Extra', 'description': 'Entry', 'amount': '7'}]})
    assert attached.status_code == 200
    assert len(attached.json()) == 2
    duplicate = client.post(f'/api/staff/tournaments/{second}/products', headers=admin, json={'existing_product_ids': [product_id], 'new_products': [{'name': 'Rollback', 'description': 'Entry', 'amount': '8'}]})
    assert duplicate.status_code == 409
    assert session.scalar(select(Product.id).where(Product.name == 'Rollback')) is None
    assert client.post(f'/api/staff/products/{product_id}/deactivate', headers=admin).status_code == 200
    third = _create_event(client, key)
    assert client.post(f'/api/staff/tournaments/{third}/products', headers=admin, json={'existing_product_ids': [product_id]}).status_code == 409
    assert client.get(f'/api/staff/tournaments/{third}/products', headers=admin).json() == []


def test_new_registration_uses_updated_terms_and_inactive_product_is_rejected(setup):
    client, key, session, _ = setup
    admin = _headers(key, role='admin')
    event = _create_event(client, key)
    result = client.post(f'/api/staff/tournaments/{event}/products', headers=admin, json={'new_products': [{'name': 'Before', 'description': 'Earlier', 'amount': '10'}]})
    product = result.json()[0]
    product_id = product['id']
    assert client.patch(f'/api/staff/products/{product_id}', headers=admin, json={'name': 'After', 'description': 'Later'}).status_code == 200
    updated = client.post(f'/api/staff/products/{product_id}/prices', headers=admin, json={'amount': '20'}).json()
    link = session.scalar(select(TournamentProduct).where(TournamentProduct.tournament_id == event, TournamentProduct.product_id == product_id))
    registration = _post_registration(client, event, _headers(key), _registration(tournament_product_id=link.id, price_id=updated['price_id']))
    assert registration.status_code == 201
    stored = session.scalar(select(TournamentRegistration).where(TournamentRegistration.registration_number == registration.json()['registration_number']))
    item = session.get(OrderItem, stored.order_item_id)
    assert (item.product_name, item.product_description, item.unit_amount) == ('After', 'Later', Decimal('20.00'))
    assert client.post(f'/api/staff/products/{product_id}/deactivate', headers=admin).status_code == 200
    response = _post_registration(client, event, _headers(key, email='other@example.test'), _registration(email='other@example.test', document='OTHER', tournament_product_id=link.id, price_id=updated['price_id']))
    assert response.status_code == 400


def test_catalog_validation_rejects_blank_and_extra_fields(setup):
    client, key, _, _ = setup
    admin = _headers(key, role='admin')
    event = _create_event(client, key)
    for draft in ({'name': '  ', 'description': 'Entry', 'amount': '1'}, {'name': 'Name', 'description': ' ', 'amount': '1'}, {'name': 'X' * 256, 'description': 'Entry', 'amount': '1'}, {'name': 'Name', 'description': 'Entry', 'amount': '1', 'is_active': True}):
        assert client.post(f'/api/staff/tournaments/{event}/products', headers=admin, json={'new_products': [draft]}).status_code == 422


def test_staff_services_reject_non_admin_actor(setup):
    from uuid import uuid4

    from app.auth.exceptions import AdminAccessRequiredException
    from app.auth.models import User
    from app.tournaments.schemas import OfferingInput
    from app.karlmart.catalog import services as catalog
    from app.tournaments.services import tournament_products, tournament_registrations

    _, _, session, _ = setup
    actor = User(id=uuid4(), app_metadata={'karlbruder_role': 'guild_member'})
    with pytest.raises(AdminAccessRequiredException):
        catalog.list_products(session, actor)
    with pytest.raises(AdminAccessRequiredException):
        tournament_products.attach_tournament_products(session, actor, 1, OfferingInput())
    with pytest.raises(AdminAccessRequiredException):
        catalog.change_product(session, actor, 1, deactivate=True)
    with pytest.raises(AdminAccessRequiredException):
        tournament_registrations.registration_totals(session, actor, 1)
