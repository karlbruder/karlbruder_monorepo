"""PAY-004/009/012: proof decisions, verified receipts and refunds stay distinct."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.core.files.models import StoredFile
from app.payments.services.records import add_payment_record, add_refund_record
from app.tournaments.models import (
    PaymentProofReview,
    RegistrationPayment,
    RegistrationRefund,
)
from app.tournaments.models import (
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)

NOW = datetime(2026, 11, 4, 12, tzinfo=timezone.utc)


def _registration(session, tournament):
    identifier = uuid4()
    row = TournamentRegistration(
        tournament_id=tournament.id,
        user_id=identifier,
        registration_number=f"fixture-{identifier.hex}",
        registration_status="awaiting_payment",
        full_name="Fixture Competitor",
        birth_date=date(2000, 1, 1),
        identity_document_type="passport",
        identity_document_number=identifier.hex,
        identity_document_number_normalized=identifier.hex,
        email=f"{identifier.hex}@example.test",
        email_normalized=f"{identifier.hex}@example.test",
        phone="+55 11 0000-0000",
        city="Fixture City",
        country="Fixture Country",
        hema_started_year=2020,
        previous_tournament_count=0,
        emergency_contact_name="Fixture Contact",
        emergency_contact_phone="+55 11 0000-0001",
    )
    session.add(row)
    session.flush()
    return row


def _document(session, registration, document_type="payment_proof"):
    document = TournamentRegistrationDocument(
        registration_id=registration.id,
        document_type=document_type,
        file=StoredFile(
            storage_key=f"fixture/{uuid4()}",
            original_file_name="proof.pdf",
            content_type="application/pdf",
            size_bytes=128,
        ),
    )
    session.add(document)
    session.flush()
    return document


def _review(session, document, **overrides):
    row = PaymentProofReview(
        **{
            "document_id": document.id,
            "decision": "approved",
            "reviewed_by_user_id": uuid4(),
            "reviewed_at": NOW,
            **overrides,
        }
    )
    session.add(row)
    session.flush()
    return row


def _payment(session, registration, review, **overrides):
    receipt = add_payment_record(
        session,
        amount_received=overrides.pop("amount_received", Decimal("125.50")),
        verified_by_user_id=overrides.pop("verified_by_user_id", uuid4()),
        verified_at=overrides.pop("verified_at", NOW),
    )
    row = RegistrationPayment(
        **{
            "registration_id": registration.id,
            "proof_review_id": review.id,
            "payment_id": receipt.id,
            **overrides,
        }
    )
    session.add(row)
    session.flush()
    return row


def _refund(session, payment, **overrides):
    due_on = overrides.pop("due_on", date(2026, 11, 18))
    shared = add_refund_record(
        session,
        payment_id=overrides.pop("payment_id", payment.payment_id),
        amount_owed=overrides.pop("amount_owed", payment.payment.amount_received),
        obligated_at=overrides.pop("obligated_at", NOW),
    )
    for name, value in overrides.items():
        setattr(shared, name, value)
    row = RegistrationRefund(
        registration_payment_id=payment.id, refund=shared, due_on=due_on
    )
    session.add(row)
    session.flush()
    return row


@pytest.fixture
def evidence(db_session):
    tournament = Tournament(
        name="Fixture Finances",
        slug=f"finances-{uuid4()}",
        starts_at=NOW,
        is_internal=False,
        competitor_capacity=0,
        registration_fee_amount=Decimal("100.00"),
    )
    db_session.add(tournament)
    db_session.flush()
    registration = _registration(db_session, tournament)
    document = _document(db_session, registration)
    return tournament, registration, document


def test_proof_reviews_retain_exact_evidence_actor_time_and_rejection_history(
    db_session, evidence
):
    tournament, registration, first = evidence
    rejected = _review(
        db_session, first, decision="rejected", rejection_reason="Unreadable amount"
    )
    second = _document(db_session, registration)
    approved = _review(db_session, second, reviewed_at=NOW + timedelta(hours=1))
    db_session.expire_all()
    assert rejected.document.id == first.id
    assert rejected.decision == "rejected"
    assert rejected.rejection_reason == "Unreadable amount"
    assert approved.document.id == second.id
    assert approved.reviewed_at > rejected.reviewed_at
    assert approved.reviewed_by_user_id != rejected.reviewed_by_user_id
    assert db_session.scalar(select(func.count()).select_from(RegistrationPayment)) == 0
    assert registration.registration_status == "awaiting_payment"
    assert tournament.competitor_capacity == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"decision": "unknown"},
        {"decision": "rejected", "rejection_reason": None},
        {"decision": "rejected", "rejection_reason": ""},
        {"decision": "rejected", "rejection_reason": " \t\n"},
        {"reviewed_by_user_id": None},
        {"reviewed_at": None},
        {"document_id": -1},
    ],
)
def test_review_rejects_invalid_decisions_missing_reasons_actors_times_and_proofs(
    db_session, evidence, changes
):
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            _review(db_session, evidence[2], **changes)


def test_parental_document_cannot_be_reviewed_as_payment_evidence(db_session, evidence):
    parental = _document(db_session, evidence[1], "parental_consent_form")
    with pytest.raises(IntegrityError, match="submitted payment proof"):
        with db_session.begin_nested():
            _review(db_session, parental)


def test_verified_payment_preserves_actual_brl_amount_independently_of_fee_and_seat(
    db_session, evidence
):
    tournament, registration, document = evidence
    review = _review(db_session, document)
    payment = _payment(db_session, registration, review)
    db_session.expire_all()
    assert payment.payment.amount_received == Decimal("125.50")
    assert payment.payment.amount_received != tournament.registration_fee_amount
    assert payment.proof_review.document.id == document.id
    assert payment.registration.id == registration.id
    assert payment.payment.verified_at == NOW
    assert payment.payment.verified_by_user_id is not None
    assert registration.registration_status == "awaiting_payment"
    assert tournament.competitor_capacity == 0


@pytest.mark.parametrize(
    "link", ["other_registration", "rejected_review", "missing_review"]
)
def test_payment_requires_an_approved_review_of_its_own_registration(
    db_session, evidence, link
):
    tournament, registration, document = evidence
    review = _review(
        db_session,
        document,
        **(
            {"decision": "rejected", "rejection_reason": "Wrong amount"}
            if link == "rejected_review"
            else {}
        ),
    )
    if link == "other_registration":
        registration = _registration(db_session, tournament)
    with pytest.raises(
        IntegrityError, match="approved proof review for the same registration"
    ):
        with db_session.begin_nested():
            _payment(
                db_session,
                registration,
                review,
                **({"proof_review_id": -1} if link == "missing_review" else {}),
            )


@pytest.mark.parametrize(
    "changes",
    [
        {"amount_received": Decimal("-0.01")},
        {"amount_received": Decimal("NaN")},
        {"verified_by_user_id": None},
        {"verified_at": None},
    ],
)
def test_payment_rejects_invalid_amount_or_missing_verification_evidence(
    db_session, evidence, changes
):
    review = _review(db_session, evidence[2])
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            _payment(db_session, evidence[1], review, **changes)


def test_registration_and_review_cannot_create_duplicate_verified_receipts(
    db_session, evidence
):
    registration, document = evidence[1:]
    review = _review(db_session, document)
    _payment(db_session, registration, review)
    for selected in (review, _review(db_session, document)):
        with pytest.raises(IntegrityError):
            with db_session.begin_nested():
                _payment(db_session, registration, selected)


def test_refund_absence_pending_obligation_and_recorded_completion_are_distinct(
    db_session, evidence
):
    registration, document = evidence[1:]
    payment = _payment(db_session, registration, _review(db_session, document))
    assert db_session.scalar(select(RegistrationRefund)) is None
    registration.registration_status = "cancelled"
    refund = _refund(db_session, payment)
    assert refund.refund.refund_status == "awaiting_refund"
    assert refund.refund.amount_owed == Decimal("125.50")
    assert refund.due_on == date(2026, 11, 18)
    assert refund.refund.completed_at is None
    assert refund.refund.completed_by_user_id is None
    refund.refund.refund_status = "completed"
    refund.refund.completed_at = NOW + timedelta(days=1)
    refund.refund.completed_by_user_id = uuid4()
    db_session.flush()
    db_session.expire_all()
    assert refund.refund.refund_status == "completed"
    assert refund.refund.completed_at > refund.refund.obligated_at
    assert refund.registration_payment.id == payment.id
    assert refund.refund.payment_id == payment.payment_id
    assert registration.registration_status == "cancelled"


@pytest.mark.parametrize(
    "changes",
    [
        {"amount_owed": Decimal("100.00")},
        {"amount_owed": Decimal("-1")},
        {"amount_owed": Decimal("NaN")},
        {"payment_id": -1},
        {"refund_status": "unknown"},
        {"refund_status": "completed"},
        {"refund_status": "completed", "completed_at": NOW},
        {"refund_status": "completed", "completed_by_user_id": uuid4()},
        {"completed_at": NOW},
        {"completed_by_user_id": uuid4()},
        {
            "refund_status": "completed",
            "completed_at": NOW - timedelta(days=1),
            "completed_by_user_id": uuid4(),
        },
        {"due_on": None},
        {"obligated_at": None},
    ],
)
def test_refund_rejects_wrong_amount_missing_obligation_and_invalid_completion_evidence(
    db_session, evidence, changes
):
    payment = _payment(db_session, evidence[1], _review(db_session, evidence[2]))
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            _refund(db_session, payment, **changes)


def test_payment_can_have_only_one_refund_obligation(db_session, evidence):
    payment = _payment(db_session, evidence[1], _review(db_session, evidence[2]))
    _refund(db_session, payment)
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            _refund(db_session, payment)


@pytest.mark.parametrize(
    "statement",
    [
        "UPDATE public.payment_proof_reviews SET decision = 'rejected', rejection_reason = 'Changed'",
        "DELETE FROM public.payment_proof_reviews",
        "UPDATE public.registration_payments SET registration_id = -1",
        "UPDATE public.payments SET amount_received = 1",
        "DELETE FROM public.registration_payments",
        "UPDATE public.tournament_registration_documents SET registration_id = -1",
    ],
)
def test_recorded_review_and_receipt_evidence_cannot_be_rewritten(
    db_session, evidence, statement
):
    _payment(db_session, evidence[1], _review(db_session, evidence[2]))
    with pytest.raises(IntegrityError, match="immutable"):
        with db_session.begin_nested():
            db_session.execute(text(statement))


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("storage_key", "fixture/replacement.pdf"),
        ("original_file_name", "replacement.pdf"),
        ("content_type", "text/plain"),
        ("size_bytes", 256),
        ("created_at", NOW + timedelta(days=1)),
    ],
)
def test_reviewed_proof_file_metadata_cannot_be_changed_through_orm(
    db_session, evidence, field, value
):
    document = evidence[2]
    review = _review(db_session, document)
    original_key = document.file.storage_key
    with pytest.raises(
        IntegrityError, match="Reviewed proof file metadata is immutable"
    ):
        with db_session.begin_nested():
            setattr(document.file, field, value)
            db_session.flush()
    db_session.expire_all()
    assert review.document.file.storage_key == original_key


@pytest.mark.parametrize(
    "statement",
    [
        "UPDATE public.stored_files SET storage_key='fixture/replacement.pdf' WHERE id=:id",
        "DELETE FROM public.stored_files WHERE id=:id",
    ],
)
def test_reviewed_proof_file_cannot_be_redirected_or_deleted_through_sql(
    db_session, evidence, statement
):
    document = evidence[2]
    _review(db_session, document)
    with pytest.raises(
        IntegrityError, match="Reviewed proof file metadata is immutable"
    ):
        with db_session.begin_nested():
            db_session.execute(text(statement), {"id": document.file_id})


def test_file_metadata_without_a_review_or_archive_remains_mutable(
    db_session, evidence
):
    document = evidence[2]
    document.file.original_file_name = "corrected-name.pdf"
    db_session.flush()
    db_session.expire_all()
    assert document.file.original_file_name == "corrected-name.pdf"


def test_tournament_refund_cannot_link_another_shared_payment(db_session, evidence):
    registration_payment = _payment(
        db_session, evidence[1], _review(db_session, evidence[2])
    )
    other = add_payment_record(
        db_session,
        amount_received=Decimal("125.50"),
        verified_by_user_id=uuid4(),
        verified_at=NOW,
    )
    refund = add_refund_record(
        db_session,
        payment_id=other.id,
        amount_owed=other.amount_received,
        obligated_at=NOW,
    )
    with pytest.raises(IntegrityError, match="Tournament refund must match"):
        with db_session.begin_nested():
            db_session.add(
                RegistrationRefund(
                    registration_payment_id=registration_payment.id,
                    refund_id=refund.id,
                    due_on=date(2026, 11, 18),
                )
            )
            db_session.flush()


def test_tournament_refund_association_cannot_be_reassigned(db_session, evidence):
    payment = _payment(db_session, evidence[1], _review(db_session, evidence[2]))
    _refund(db_session, payment)
    with pytest.raises(IntegrityError, match="immutable"):
        with db_session.begin_nested():
            db_session.execute(
                text("UPDATE public.registration_refunds SET refund_id=-1")
            )
