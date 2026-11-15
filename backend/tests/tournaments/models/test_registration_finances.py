"""PAY-004/009/012: proof decisions, verified receipts and refunds stay distinct."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.files.models import StoredFile
from app.karlmart.payments.services.records import add_payment_record, add_refund_record
from app.karlmart.catalog.models import Price, Product
from app.karlmart.orders.models import Order, OrderItem
from app.karlmart.payments.models import Refund
from app.tournaments.models import TournamentProduct
from app.tournaments.models import (
    PaymentProofReview,
    PaymentProofPayment,
)
from app.tournaments.models import (
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)

NOW = datetime(2026, 11, 4, 12, tzinfo=timezone.utc)


def _registration(session, tournament):
    identifier = uuid4()
    product = Product(name="Entry", description="Tournament entry")
    order = Order(user_id=identifier, status="pending")
    session.add_all([product, order])
    session.flush()
    price = Price(product_id=product.id, amount=Decimal("100.00"))
    tournament_product = TournamentProduct(tournament_id=tournament.id, product_id=product.id)
    session.add_all([price, tournament_product])
    session.flush()
    item = OrderItem(order_id=order.id, price_id=price.id, product_name=product.name,
                     product_description=product.description, unit_amount=price.amount)
    session.add(item)
    session.flush()
    row = TournamentRegistration(
        tournament_product_id=tournament_product.id, order_item_id=item.id,
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
        order_id=registration.order_item.order_id,
        amount_received=overrides.pop("amount_received", Decimal("125.50")),
        verified_by_user_id=overrides.pop("verified_by_user_id", uuid4()),
        verified_at=overrides.pop("verified_at", NOW),
    )
    row = PaymentProofPayment(
        **{
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
        due_on=due_on,
    )
    for name, value in overrides.items():
        setattr(shared, name, value)
    session.flush()
    return shared


@pytest.fixture
def evidence(db_session):
    tournament = Tournament(
        name="Fixture Finances",
        slug=f"finances-{uuid4()}",
        starts_at=NOW,
        is_internal=False,
        competitor_capacity=0,
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
    assert db_session.scalar(select(func.count()).select_from(PaymentProofPayment)) == 0
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




def test_verified_payment_preserves_actual_brl_amount_independently_of_fee_and_seat(
    db_session, evidence
):
    tournament, registration, document = evidence
    review = _review(db_session, document)
    payment = _payment(db_session, registration, review)
    db_session.expire_all()
    assert payment.payment.amount_received == Decimal("125.50")
    assert payment.payment.amount_received != registration.order_item.unit_amount
    assert payment.proof_review.document.id == document.id
    assert payment.payment.verified_at == NOW
    assert payment.payment.verified_by_user_id is not None
    assert registration.registration_status == "awaiting_payment"
    assert tournament.competitor_capacity == 0




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
    assert db_session.scalar(select(Refund)) is None
    registration.registration_status = "cancelled"
    refund = _refund(db_session, payment)
    assert refund.refund_status == "awaiting_refund"
    assert refund.amount_owed == Decimal("125.50")
    assert refund.due_on == date(2026, 11, 18)
    assert refund.completed_at is None
    assert refund.completed_by_user_id is None
    refund.refund_status = "completed"
    refund.completed_at = NOW + timedelta(days=1)
    refund.completed_by_user_id = uuid4()
    db_session.flush()
    db_session.expire_all()
    assert refund.refund_status == "completed"
    assert refund.completed_at > refund.obligated_at
    assert refund.payment_id == payment.payment_id
    assert registration.registration_status == "cancelled"


@pytest.mark.parametrize(
    "changes",
    [
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










def test_file_metadata_without_a_review_or_archive_remains_mutable(
    db_session, evidence
):
    document = evidence[2]
    document.file.original_file_name = "corrected-name.pdf"
    db_session.flush()
    db_session.expire_all()
    assert document.file.original_file_name == "corrected-name.pdf"






def test_registration_tags_reject_cross_tournament_duplicates_and_deletion(db_session):
    from app.tournaments.models import RegistrationTag, TournamentTag

    first = Tournament(name="First", slug=f"first-{uuid4().hex}", starts_at=NOW)
    second = Tournament(name="Second", slug=f"second-{uuid4().hex}", starts_at=NOW)
    db_session.add_all([first, second])
    db_session.flush()
    registration = _registration(db_session, first)
    tag = TournamentTag(tournament_id=first.id, name="Tag", eligibility_description="Criterion")
    other_tag = TournamentTag(tournament_id=second.id, name="Other", eligibility_description="Criterion")
    db_session.add_all([tag, other_tag])
    db_session.flush()
    db_session.add(RegistrationTag(registration_id=registration.id, tournament_id=first.id, tag_id=tag.id))
    db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(RegistrationTag(registration_id=registration.id, tournament_id=first.id, tag_id=tag.id))
        db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(RegistrationTag(registration_id=registration.id, tournament_id=first.id, tag_id=other_tag.id))
        db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.delete(tag)
        db_session.flush()


def test_tag_editing_enforces_owner_closure_and_staff_override(db_session, monkeypatch):
    from app.auth.models import User
    from app.tournaments.exceptions import RegistrationNotAllowedError, RegistrationResourceNotFoundError
    from app.tournaments.models import TournamentTag
    from app.tournaments.services import tournament_tags

    tournament = Tournament(name="Tags", slug=f"tags-{uuid4().hex}", starts_at=NOW,
                            registration_opens_on=date(2026, 11, 1), registration_closes_on=date(2026, 11, 15))
    db_session.add(tournament)
    db_session.flush()
    registration = _registration(db_session, tournament)
    owner = User(id=registration.user_id)
    stranger = User(id=uuid4())
    admin = User(id=uuid4(), app_metadata={"karlbruder_role": "admin"})
    tag = TournamentTag(tournament_id=tournament.id, name="Tag", eligibility_description="Criterion")
    db_session.add(tag)
    db_session.flush()
    monkeypatch.setattr(tournament_tags.tournament_local_dates, "current_local_calendar_date", lambda: date(2026, 11, 15))
    assert [row.id for row in tournament_tags.registration_tags(db_session, tournament.id, registration.registration_number, owner, [tag.id])] == [tag.id]
    with pytest.raises(RegistrationResourceNotFoundError):
        tournament_tags.registration_tags(db_session, tournament.id, registration.registration_number, stranger, [])
    with pytest.raises(RegistrationNotAllowedError):
        tournament_tags.registration_tags(db_session, tournament.id, registration.registration_number, owner, [tag.id, tag.id])
    tournament.is_registration_closed = True
    db_session.flush()
    with pytest.raises(RegistrationNotAllowedError):
        tournament_tags.registration_tags(db_session, tournament.id, registration.registration_number, owner, [])
    assert tournament_tags.registration_tags(db_session, tournament.id, registration.registration_number, admin, [], staff=True) == []


def test_payment_and_pending_refund_amounts_can_be_corrected_in_database(db_session, evidence):
    payment = _payment(db_session, evidence[1], _review(db_session, evidence[2]))
    refund = _refund(db_session, payment)
    payment.payment.amount_received = Decimal("100.00")
    refund.amount_owed = Decimal("100.00")
    db_session.flush()
    db_session.expire_all()
    assert payment.payment.amount_received == Decimal("100.00")
    assert refund.amount_owed == Decimal("100.00")
