"""PAY-AC-005/007/012: exact-proof decisions, atomic receipts and owner outcomes."""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.auth.account_email import AccountEmailReadError
from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.core.mail import MailDeliveryError
from app.main import karlbruder_app
from app.payments.models import Payment
from app.tournaments.models import (
    PaymentProofReview,
    RegistrationPayment,
    TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.schemas import PaymentReviewDecisionCreate
from app.tournaments.services.payment_proof_reviews import (
    record_payment_review_decision,
)
from tests.tournaments.test_payment_proof_reviews import _pending
from tests.tournaments.test_tournament_registrations import (
    setup as registration_setup,
    _headers,
)


@pytest.fixture(name="setup")
def decision_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def _clients():
    accounts, sender = Mock(), Mock()
    accounts.read_email.return_value = "current@example.test"
    karlbruder_app.state.account_email_reader = accounts
    karlbruder_app.state.mail_sender = sender
    return accounts, sender


def _decide(setup, registration, document, **changes):
    client, key, _session, _storage = setup
    payload = {
        "document_id": document.id,
        "decision": "approved",
        "amount_received": "123.45",
        "requirements_checked": True,
        **changes,
    }
    return client.post(
        f"/api/staff/tournaments/payment-reviews/{registration.registration_number}/decisions",
        headers=_headers(key, role="admin"),
        json=payload,
    )


@pytest.mark.parametrize(
    "capacity,status", [(None, "confirmed"), (1, "confirmed"), (0, "waitlist")]
)
def test_approval_records_exact_proof_receipt_and_capacity_outcome(
    setup, capacity, status
):
    registration, documents = _pending(setup)
    session = setup[2]
    registration.tournament.registration_fee_amount = Decimal("99.00")
    registration.tournament.competitor_capacity = capacity
    registration.tournament.payment_due_at = datetime(2020, 1, 1, tzinfo=UTC)
    session.flush()
    accounts, sender = _clients()
    response = _decide(setup, registration, documents[-1])
    assert response.status_code == 200, response.text
    assert response.json()["registration_status"] == status
    review = session.scalar(select(PaymentProofReview))
    receipt = session.scalar(select(RegistrationPayment))
    payment = session.get(Payment, receipt.payment_id)
    assert receipt.proof_review_id == review.id
    assert review.document_id == documents[-1].id
    assert payment.amount_received == Decimal("123.45")
    assert payment.verified_by_user_id == review.reviewed_by_user_id
    assert payment.verified_at == review.reviewed_at
    assert registration.registration_status == status
    assert sender.send.call_count == (1 if status == "waitlist" else 0)
    if status == "waitlist":
        assert sender.send.call_args.kwargs["recipient"] == "current@example.test"
        assert "não tem uma vaga confirmada" in sender.send.call_args.kwargs["body"]
    repeated = _decide(setup, registration, documents[-1])
    assert repeated.status_code == 409
    assert session.scalar(select(func.count()).select_from(Payment)) == 1
    assert accounts.read_email.call_count == (1 if status == "waitlist" else 0)


def test_rejection_is_visible_and_new_proof_supersedes_it_without_receipt(setup):
    client, key, session, storage = setup
    registration, documents = _pending(setup)
    registration.tournament.payment_due_at = datetime(2020, 1, 1, tzinfo=UTC)
    session.flush()
    _clients()
    response = _decide(
        setup,
        registration,
        documents[-1],
        decision="rejected",
        amount_received=None,
        rejection_reason="  Ilegível  ",
    )
    assert response.status_code == 200, response.text
    assert response.json()["registration_status"] == "awaiting_payment"
    owner = _headers(key, user_id=registration.user_id)
    base = f"/api/tournaments/{registration.tournament_id}/registrations/{registration.registration_number}"
    current = client.get(base + "/payment", headers=owner).json()
    assert current["current_review"]["rejection_reason"] == "Ilegível"
    assert _decide(setup, registration, documents[-1]).status_code == 409
    upload = client.post(base + "/payment-proof/upload-url", headers=owner)
    assert upload.status_code == 200, upload.text
    storage.objects[upload.json()["storage_key"]] = (
        b"%PDF-1.4\nnew proof",
        "application/pdf",
    )
    submitted = client.post(
        base + "/payment-proof",
        headers=owner,
        json={
            "storage_key": upload.json()["storage_key"],
            "original_file_name": "new.pdf",
        },
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["registration_status"] == "awaiting_payment_confirmation"
    assert client.get(base + "/payment", headers=owner).json()["current_review"] is None
    assert session.scalar(select(func.count()).select_from(PaymentProofReview)) == 1
    assert session.scalar(select(func.count()).select_from(Payment)) == 0
    assert (
        session.scalar(select(func.count()).select_from(TournamentRegistrationDocument))
        == 3
    )
    assert client.get(base + "/payment", headers=_headers(key)).status_code == 404


@pytest.mark.parametrize(
    "failure,expected",
    [
        (AccountEmailReadError("private"), "lookup_failed"),
        (MailDeliveryError("private"), "send_failed"),
    ],
)
def test_notification_failure_preserves_committed_decision(setup, failure, expected):
    registration, documents = _pending(setup)
    registration.tournament.competitor_capacity = 0
    setup[2].flush()
    accounts, sender = _clients()
    if expected == "lookup_failed":
        accounts.read_email.side_effect = failure
    else:
        sender.send.side_effect = failure
    response = _decide(setup, registration, documents[-1])
    assert response.status_code == 200, response.text
    assert response.json()["notification_result"] == expected
    setup[2].expire_all()
    assert (
        setup[2].get(TournamentRegistration, registration.id).registration_status
        == "waitlist"
    )
    assert setup[2].scalar(select(func.count()).select_from(Payment)) == 1


@pytest.mark.parametrize(
    "status", ["awaiting_payment", "confirmed", "waitlist", "cancelled"]
)
def test_invalid_status_does_not_record_a_decision(setup, status):
    registration, documents = _pending(setup)
    registration.registration_status = status
    setup[2].flush()
    _clients()
    assert _decide(setup, registration, documents[-1]).status_code == 409
    assert setup[2].scalar(select(func.count()).select_from(PaymentProofReview)) == 0


def test_stale_and_foreign_proofs_are_rejected_without_receipts(setup):
    registration, documents = _pending(setup)
    _other, foreign = _pending(setup)
    _clients()
    for document in [documents[0], foreign[-1]]:
        assert _decide(setup, registration, document).status_code == 409
    assert setup[2].scalar(select(func.count()).select_from(Payment)) == 0


def test_minor_without_parental_form_cannot_be_approved(setup):
    registration, documents = _pending(setup)
    registration.birth_date = datetime(2012, 1, 1).date()
    setup[2].flush()
    _clients()
    assert _decide(setup, registration, documents[-1]).status_code == 422
    assert setup[2].scalar(select(func.count()).select_from(PaymentProofReview)) == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"amount_received": "NaN"},
        {"amount_received": "-1"},
        {"amount_received": "1.234"},
        {"amount_received": "10000000000"},
        {"requirements_checked": False},
        {"decision": "rejected", "amount_received": None, "rejection_reason": " "},
    ],
)
def test_invalid_decision_input_is_rejected(setup, changes):
    registration, documents = _pending(setup)
    _clients()
    assert _decide(setup, registration, documents[-1], **changes).status_code == 422


def test_zero_received_amount_is_valid(setup):
    registration, documents = _pending(setup)
    _clients()
    assert (
        _decide(setup, registration, documents[-1], amount_received="0").status_code
        == 200
    )


def test_non_admin_service_and_http_calls_are_forbidden(setup):
    client, key, session, _storage = setup
    payload = PaymentReviewDecisionCreate(
        document_id=1, decision="approved", amount_received=0, requirements_checked=True
    )
    with pytest.raises(AdminAccessRequiredException):
        record_payment_review_decision(
            session,
            User(id=uuid4(), user_metadata={"karlbruder_role": "admin"}),
            "unknown",
            payload,
            accounts=Mock(),
            sender=Mock(),
            application_base_url=None,
            from_address="a@example.test",
        )
    path = "/api/staff/tournaments/payment-reviews/unknown/decisions"
    assert client.post(path, json=payload.model_dump(mode="json")).status_code == 401
    assert (
        client.post(
            path, headers=_headers(key), json=payload.model_dump(mode="json")
        ).status_code
        == 403
    )


@pytest.mark.parametrize("failed_stage", ["receipt", "commit"])
def test_database_failure_after_receipt_flush_rolls_back_all_review_changes(
    setup, monkeypatch, failed_stage
):
    from app.tournaments.services import payment_proof_reviews as service

    registration, documents = _pending(setup)
    session = setup[2]
    session.commit()
    original = service.add_payment_record

    def fail_after_receipt(*args, **kwargs):
        original(*args, **kwargs)
        raise SQLAlchemyError("injected receipt failure")

    if failed_stage == "receipt":
        monkeypatch.setattr(service, "add_payment_record", fail_after_receipt)
    else:
        from sqlalchemy import event

        def fail_before_commit(current_session):
            current_session.flush()
            raise SQLAlchemyError(
                "injected failure after association and status writes"
            )

        event.listen(session, "before_commit", fail_before_commit)
    with pytest.raises(SQLAlchemyError):
        record_payment_review_decision(
            session,
            User(id=uuid4(), app_metadata={"karlbruder_role": "admin"}),
            registration.registration_number,
            PaymentReviewDecisionCreate(
                document_id=documents[-1].id,
                decision="approved",
                amount_received=1,
                requirements_checked=True,
            ),
            accounts=Mock(),
            sender=Mock(),
            application_base_url=None,
            from_address="a@example.test",
        )
    assert session.scalar(select(func.count()).select_from(PaymentProofReview)) == 0
    assert session.scalar(select(func.count()).select_from(Payment)) == 0
    assert (
        session.get(TournamentRegistration, registration.id).registration_status
        == "awaiting_payment_confirmation"
    )
