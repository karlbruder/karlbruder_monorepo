"""Cancellation and manual refunds retain distinct participation and payment states."""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app.karlmart.payments.models import Payment, Refund
from app.main import karlbruder_app
from app.tournaments.models import Tournament
from tests.tournaments.test_payment_proof_reviews import _pending
from tests.tournaments.test_payment_review_decisions import _decide
from tests.tournaments.test_tournament_registrations import _event, _headers, setup as registration_setup


QUEUE = "/api/staff/tournaments/refunds"
REFUNDABLE_POLICY = {"refunds_allowed": True, "cancellation_policy_text": "Full refunds on cancellation."}


@pytest.fixture(name="setup")
def refund_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def test_unpaid_cancellation_has_no_refund_and_rejects_another_user(setup):
    registration, _ = _pending(setup, **REFUNDABLE_POLICY)
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
    registration, documents = _pending(setup, **REFUNDABLE_POLICY)
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
    session.get(Tournament, registration.tournament_id).refunds_allowed = False
    session.commit()
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


def test_nonrefundable_event_blocks_athlete_cancellation_and_staff_cancels_without_refund(setup):
    """ADR 0011: send eligibility to the athlete and protect both participation and receipts."""
    registration, documents = _pending(setup)
    client, key, session, _ = setup
    assert _decide(setup, registration, documents[-1]).status_code == 200
    tournament_path = f"/api/tournaments/{registration.tournament_id}"
    path = f"{tournament_path}/registrations/{registration.registration_number}"
    owner = _headers(key, user_id=registration.user_id)
    assert client.get(tournament_path, headers=owner).json()["refunds_allowed"] is False
    assert client.post(f"{path}/cancel", headers=owner).status_code == 409
    assert registration.registration_status == "confirmed"
    assert client.post(f"{path}/cancel", headers=_headers(key, role="admin")).status_code == 204
    assert registration.registration_status == "cancelled"
    assert client.get(f"{path}/refund", headers=owner).json() is None
    assert session.scalar(select(Payment)).amount_received == Decimal("123.45")


def test_staff_cannot_enable_refunds_without_a_cancellation_policy(setup):
    """Opting in requires a published policy source."""
    client, key, _, _ = setup
    response = client.post(
        "/api/staff/tournaments",
        headers=_headers(key, role="admin"),
        json=_event(refunds_allowed=True, cancellation_policy_text=" ", cancellation_policy_url=None),
    )
    assert response.status_code == 422
    assert "Refunds require a cancellation policy" in response.text


@pytest.mark.parametrize("decision", ["approved", "rejected"])
def test_cancelled_pending_proof_remains_reviewable_without_restoring_participation(setup, decision):
    registration, documents = _pending(setup, **REFUNDABLE_POLICY)
    client, key, session, _ = setup
    owner = _headers(key, user_id=registration.user_id)
    path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}"
    assert client.post(f"{path}/cancel", headers=owner).status_code == 204
    cancelled_at = registration.refundable_cancelled_at
    registration.tournament.refunds_allowed = False
    session.commit()
    admin = _headers(key, role="admin")
    queue = client.get("/api/staff/tournaments/payment-reviews", headers=admin).json()
    assert registration.registration_number in [item["registration_number"] for item in queue["items"]]
    changes = {} if decision == "approved" else {"decision": "rejected", "amount_received": None, "rejection_reason": "Invalid proof"}
    assert _decide(setup, registration, documents[-1], **changes).status_code == 200
    assert registration.registration_status == "cancelled"
    refund = session.scalar(select(Refund))
    if decision == "approved":
        assert refund.amount_owed == Decimal("123.45")
        assert refund.obligated_at == cancelled_at
    else:
        assert refund is None
    assert client.get("/api/staff/tournaments/payment-reviews", headers=admin).json()["total"] == 0


def test_internal_cancellation_requires_current_guild_access(setup):
    registration, _ = _pending(setup, internal=True, **REFUNDABLE_POLICY)
    client, key, session, _ = setup
    session.commit()
    path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/cancel"
    assert client.post(path, headers=_headers(key, user_id=registration.user_id)).status_code == 404
    assert registration.registration_status == "awaiting_payment_confirmation"
    assert client.post(path, headers=_headers(key, role="admin")).status_code == 204




def test_staff_declines_late_payment_in_nonrefundable_tournament_without_obligation(setup):
    registration, documents = _pending(setup)
    client, key, session, _ = setup
    registration.tournament.payment_due_at = datetime(2020, 1, 1, tzinfo=UTC)
    assert _decide(setup, registration, documents[-1]).status_code == 200
    path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/cancel"
    assert client.post(path, headers=_headers(key, role="admin")).status_code == 204
    assert registration.registration_status == "cancelled"
    assert session.scalar(select(Refund)) is None


def test_unlinked_receipt_cannot_cancel_until_reconciled(setup):
    from app.karlmart.orders.models import OrderItem
    from app.karlmart.payments.services.records import add_payment_record

    registration, _ = _pending(setup, **REFUNDABLE_POLICY)
    client, key, session, _ = setup
    now = datetime.now(UTC)
    order = session.get(OrderItem, registration.order_item_id)
    add_payment_record(session, order_id=order.order_id, amount_received=Decimal("123.45"),
                                 verified_by_user_id=registration.user_id, verified_at=now)
    session.commit()
    path = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/cancel"
    assert client.post(path, headers=_headers(key, user_id=registration.user_id)).status_code == 409
    assert registration.registration_status == "awaiting_payment_confirmation"
    assert session.scalar(select(Refund)) is None


def test_existing_unlinked_refund_remains_visible_and_completable(setup):
    from app.karlmart.orders.models import OrderItem
    from app.karlmart.payments.services.records import add_payment_record, add_refund_record
    from app.tournaments.services.tournament_local_dates import refund_due_date

    registration, _ = _pending(setup, **REFUNDABLE_POLICY)
    client, key, session, _ = setup
    now = datetime.now(UTC)
    order_item = session.get(OrderItem, registration.order_item_id)
    payment = add_payment_record(session, order_id=order_item.order_id, amount_received=Decimal("123.45"),
                                 verified_by_user_id=registration.user_id, verified_at=now)
    registration.registration_status = "cancelled"
    refund = add_refund_record(session, payment_id=payment.id, amount_owed=payment.amount_received,
                               obligated_at=now, due_on=refund_due_date(now))
    session.commit()
    admin = _headers(key, role="admin")
    assert client.get(QUEUE, headers=admin).json()["total"] == 1
    path = f"/api/staff/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}/refund/complete"
    assert client.post(path, headers=admin, json={"completed_at": datetime.now(UTC).isoformat()}).status_code == 200
    assert refund.refund_status == "completed"


def test_refund_read_service_and_route_enforce_internal_visibility_after_change(setup):
    """CAT-005: owners retain access only while their role can view the tournament."""
    from app.auth.models import User
    from app.tournaments.exceptions import RegistrationResourceNotFoundError
    from app.tournaments.services.registration_cancellations import read_registration_refund

    registration, documents = _pending(setup, **REFUNDABLE_POLICY)
    client, key, session, _ = setup
    assert _decide(setup, registration, documents[-1]).status_code == 200
    tournament_id = registration.tournament_id
    number = registration.registration_number
    owner_id = registration.user_id
    path = f"/api/tournaments/{tournament_id}/registrations/{number}"
    assert client.post(f"{path}/cancel", headers=_headers(key, user_id=owner_id)).status_code == 204
    regular = User(id=owner_id)
    member = User(id=owner_id, app_metadata={"karlbruder_role": "guild_member"})
    admin = User(id=owner_id, app_metadata={"karlbruder_role": "admin"})
    assert read_registration_refund(session, tournament_id, number, regular) is not None
    session.get(Tournament, tournament_id).is_internal = True
    session.commit()
    with pytest.raises(RegistrationResourceNotFoundError):
        read_registration_refund(session, tournament_id, number, regular)
    assert read_registration_refund(session, tournament_id, number, member) is not None
    assert read_registration_refund(session, tournament_id, number, admin) is not None
    assert client.get(f"{path}/refund", headers=_headers(key, user_id=owner_id)).status_code == 404
    assert client.get(f"{path}/refund", headers=_headers(key, user_id=owner_id, role="guild_member")).status_code == 200
    assert client.get(f"{path}/refund", headers=_headers(key, role="admin")).status_code == 200
