"""Cancellation and manual refunds retain distinct participation and payment states."""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app.karlmart.payments.models import Refund
from app.main import karlbruder_app
from tests.tournaments.test_payment_proof_reviews import _pending
from tests.tournaments.test_payment_review_decisions import _decide
from tests.tournaments.test_tournament_registrations import _headers, setup as registration_setup


QUEUE = "/api/staff/tournaments/refunds"


@pytest.fixture(name="setup")
def refund_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def test_unpaid_cancellation_has_no_refund_and_rejects_another_user(setup):
    registration, _ = _pending(setup)
    client, key, session, _ = setup
    path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}"
    assert client.post(f"{path}/cancel", headers=_headers(key)).status_code == 404
    owner = _headers(key, user_id=registration.user_id)
    assert client.post(f"{path}/cancel", headers=owner).status_code == 204
    assert client.get(f"{path}/refund", headers=owner).json() is None
    assert client.post(f"{path}/cancel", headers=owner).status_code == 409
    assert session.scalars(select(Refund)).all() == []


def test_paid_cancellation_records_full_refund_and_completion_notifies_current_email(setup):
    """PAY-AC-008/013: expose the obligation, record completion once, and notify after commit."""
    registration, documents = _pending(setup)
    client, key, session, _ = setup
    accounts, sender = Mock(), Mock()
    accounts.read_email.return_value = "current@example.test"
    karlbruder_app.state.account_email_reader = accounts
    karlbruder_app.state.mail_sender = sender
    assert _decide(setup, registration, documents[-1]).status_code == 200
    path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}"
    owner = _headers(key, user_id=registration.user_id)
    admin = _headers(key, role="admin")
    assert client.post(f"{path}/cancel", headers=owner).status_code == 204
    refund = session.scalar(select(Refund))
    assert refund.amount_owed == Decimal("123.45")
    assert refund.refund_status == "awaiting_refund"
    assert registration.registration_status == "cancelled"
    assert sender.send.call_count == 0
    assert client.get(f"{path}/refund", headers=_headers(key)).status_code == 404
    assert client.get(f"{path}/refund", headers=owner).json() == {
        "amount_owed": "123.45",
        "refund_status": "awaiting_refund",
        "due_on": refund.due_on.isoformat(),
        "completed_at": None,
    }
    assert client.get(QUEUE).status_code == 401
    assert client.get(QUEUE, headers=owner).status_code == 403
    queue = client.get(QUEUE, headers=admin, params={
        "registration_number": registration.registration_number, "limit": 1,
    }).json()
    assert queue["total"] == 1
    assert queue["items"][0]["registration_number"] == registration.registration_number
    assert queue["items"][0]["tournament_id"] == registration.tournament_id
    assert queue["items"][0]["amount_owed"] == "123.45"
    assert client.get(QUEUE, headers=admin, params={"offset": 1}).json()["items"] == []
    assert client.get(
        QUEUE, headers=admin, params={"registration_number": "no-match"}
    ).json()["total"] == 0
    staff_path = f"/api/staff/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/refund/complete"
    payload = {"completed_at": datetime.now(UTC).isoformat()}
    assert client.post(staff_path, headers=owner, json=payload).status_code == 403
    premature = {"completed_at": "2000-01-01T12:00:00-03:00"}
    assert client.post(staff_path, headers=admin, json=premature).status_code == 409
    result = client.post(staff_path, headers=admin, json=payload)
    assert result.status_code == 200
    assert refund.refund_status == "completed"
    assert registration.registration_status == "cancelled"
    assert client.get(QUEUE, headers=admin).json()["items"] == []
    completed = client.get(f"{path}/refund", headers=owner).json()
    assert completed["refund_status"] == "completed"
    assert datetime.fromisoformat(completed["completed_at"]) == datetime.fromisoformat(payload["completed_at"])
    assert sender.send.call_args.kwargs["recipient"] == "current@example.test"
    assert client.post(staff_path, headers=admin, json=payload).status_code == 409
    assert sender.send.call_count == 1
