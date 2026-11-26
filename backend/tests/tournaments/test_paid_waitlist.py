"""Staff may select a paid waitlist registration when a seat is available."""

import pytest
from sqlalchemy import select

from app.tournaments.models import Tournament, TournamentRegistration
from tests.tournaments.test_payment_proof_reviews import _pending
from tests.tournaments.test_tournament_registrations import _headers, setup as registration_setup


@pytest.fixture(name="setup")
def paid_waitlist_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def test_waitlist_routes_require_admin(setup):
    client, key, _, _ = setup
    for method, path in ((client.get, '/api/staff/tournaments/1/waitlist'),
                         (client.post, '/api/staff/tournaments/1/registrations/unknown/confirm')):
        assert method(path).status_code == 401
        assert method(path, headers=_headers(key, role='regular_user')).status_code == 403


def test_list_and_confirm_waitlist_without_changing_other_registrations(setup):
    client, key, session, _ = setup
    registration, _ = _pending(setup)
    registration.registration_status = 'waitlist'
    tournament = session.get(Tournament, registration.tournament_id)
    tournament.competitor_capacity = None
    session.flush()
    base = f'/api/staff/tournaments/{tournament.id}'
    headers = _headers(key, role='admin')
    result = client.get(f'{base}/waitlist', headers=headers)
    assert result.status_code == 200
    assert result.json()['registrations'][0]['registration_number'] == registration.registration_number
    assert set(result.json()['registrations'][0]) == {'registration_number', 'full_name', 'social_name', 'registration_status', 'parental_consent_required', 'tags'}
    result = client.post(f'{base}/registrations/{registration.registration_number}/confirm', headers=headers)
    assert result.status_code == 200, result.text
    assert result.json() == {'registration_status': 'confirmed'}
    assert client.post(f'{base}/registrations/{registration.registration_number}/confirm', headers=headers).status_code == 409
    assert client.get(f'{base}/waitlist', headers=headers).json()['registrations'] == []


def test_full_tournament_rejects_confirmation(setup):
    client, key, session, _ = setup
    registration, _ = _pending(setup)
    registration.registration_status = 'waitlist'
    tournament = session.get(Tournament, registration.tournament_id)
    tournament.competitor_capacity = 0
    session.flush()
    result = client.post(f'/api/staff/tournaments/{tournament.id}/registrations/{registration.registration_number}/confirm', headers=_headers(key, role='admin'))
    assert result.status_code == 409
    assert session.scalar(select(TournamentRegistration.registration_status).where(TournamentRegistration.id == registration.id)) == 'waitlist'


@pytest.mark.parametrize('refundable', [True, False])
def test_paid_waitlist_cancellation_respects_refund_policy(setup, refundable):
    from app.karlmart.payments.models import Payment, Refund
    from tests.tournaments.test_payment_review_decisions import _decide
    from tests.tournaments.test_registration_refunds import _pending_refundable

    client, key, session, _ = setup
    registration, documents = _pending_refundable(setup) if refundable else _pending(setup)
    tournament = session.get(Tournament, registration.tournament_id)
    tournament.competitor_capacity = 0
    session.flush()
    assert _decide(setup, registration, documents[-1]).status_code == 200
    assert registration.registration_status == 'waitlist'
    payment = session.scalar(select(Payment))
    path = f'/api/tournaments/{tournament.id}/registrations/{registration.registration_number}'
    assert client.post(f'{path}/cancel', headers=_headers(key, role='admin')).status_code == 204
    refund = session.scalar(select(Refund).where(Refund.payment_id == payment.id))
    if refundable:
        assert refund.refund_status == 'awaiting_refund'
        assert refund.completed_at is None
    else:
        assert refund is None


def test_minor_without_consent_remains_on_waitlist(setup):
    from datetime import date

    client, key, session, _ = setup
    registration, _ = _pending(setup)
    registration.registration_status = 'waitlist'
    registration.birth_date = date(2015, 1, 1)
    session.flush()
    path = f'/api/staff/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/confirm'
    response = client.post(path, headers=_headers(key, role='admin'))
    assert response.status_code == 422
    assert registration.registration_status == 'waitlist'


def test_other_tournament_and_non_waitlist_registration_conflict(setup):
    client, key, _, _ = setup
    registration, _ = _pending(setup)
    headers = _headers(key, role='admin')
    path = f'/api/staff/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/confirm'
    assert client.post(path, headers=headers).status_code == 409
    assert client.post(f'/api/staff/tournaments/999999/registrations/{registration.registration_number}/confirm', headers=headers).status_code == 409


def test_capacity_change_and_cancellation_do_not_promote_paid_waitlist(setup):
    from app.karlmart.payments.models import Payment
    from tests.tournaments.test_payment_review_decisions import _decide

    client, key, session, _ = setup
    registration, documents = _pending(setup)
    tournament = session.get(Tournament, registration.tournament_id)
    tournament.competitor_capacity = 0
    session.flush()
    assert _decide(setup, registration, documents[-1]).status_code == 200
    payment = session.scalar(select(Payment))
    payment_id, amount = payment.id, payment.amount_received
    tournament.competitor_capacity = 1
    session.commit()
    assert registration.registration_status == 'waitlist'
    path = f'/api/staff/tournaments/{tournament.id}/registrations/{registration.registration_number}/confirm'
    response = client.post(path, headers=_headers(key, role='admin'))
    assert response.status_code == 200
    assert session.get(Payment, payment_id).amount_received == amount
    assert len(session.scalars(select(Payment)).all()) == 1


def test_cancelling_confirmed_registration_does_not_promote_waitlist(setup):
    client, key, session, _ = setup
    first, _ = _pending(setup)
    from tests.tournaments.test_tournament_registrations import _post_registration, _registration
    from uuid import uuid4

    response = _post_registration(client, first.tournament_id, _headers(key, user_id=uuid4(), email='other@example.test'), _registration(email='other@example.test', document='other'))
    assert response.status_code == 201, response.text
    second = session.scalar(select(TournamentRegistration).where(TournamentRegistration.registration_number == response.json()['registration_number']))
    first.registration_status = 'confirmed'
    second.registration_status = 'waitlist'
    session.commit()
    path = f'/api/tournaments/{first.tournament_id}/registrations/{first.registration_number}/cancel'
    assert client.post(path, headers=_headers(key, role='admin')).status_code == 204
    assert second.registration_status == 'waitlist'
