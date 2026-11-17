"""Real transactions serialize staff changes against registration workflows."""

from concurrent.futures import ThreadPoolExecutor, TimeoutError
from datetime import UTC, date, datetime
from decimal import Decimal
from threading import Event
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy import delete, event, select, text
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.files.models import StoredFile
from app.karlmart.catalog.models import Price, Product
from app.tournaments.exceptions import RegistrationConflictError
from app.tournaments.models import (
    RegistrationAcceptance,
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
    TournamentProduct,
)
from app.tournaments.schemas import (
    PaymentReviewDecisionCreate,
    RegistrationCreate,
    TournamentCreate,
)
from app.tournaments.services.payment_proof_reviews import (
    record_payment_review_decision,
)
from app.tournaments.services.registration_payments import (
    read_registration_payment_instructions,
)
from app.tournaments.services.registration_acceptances import (
    build_registration_acceptance_content,
    calculate_registration_acceptance_digest,
)
from app.tournaments.services.tournament_administration import (
    delete_tournament,
    update_tournament,
)
from app.tournaments.services.tournament_registrations import (
    create_tournament_registration,
)
from tests.tournaments.test_tournament_registrations import (
    _registration,
    setup as registration_setup,
)


@pytest.fixture(name="setup")
def concurrency_setup(monkeypatch, db_session):
    yield from registration_setup.__wrapped__(monkeypatch, db_session)


def _event_and_payload(engine):
    with Session(engine) as session:
        tournament = Tournament(
            name="Concurrent fixture",
            slug=f"race-{uuid4().hex}",
            starts_at=datetime(2027, 1, 17, 12, tzinfo=UTC),
            is_internal=False,
            registration_opens_on=date(2026, 10, 1),
            registration_closes_on=date(2026, 10, 31),
        )
        session.add(tournament)
        session.flush()
        product = Product(name="Entry", description="Tournament entry")
        session.add(product)
        session.flush()
        session.add_all([
            TournamentProduct(tournament_id=tournament.id, product_id=product.id),
            Price(product_id=product.id, amount=Decimal("100.00")),
        ])
        session.commit()
        token = calculate_registration_acceptance_digest(build_registration_acceptance_content(tournament, "pt"))
        payload = TournamentCreate(
            name=tournament.name,
            slug=tournament.slug,
            starts_at=tournament.starts_at,
            is_internal=False,
            registration_opens_on=tournament.registration_opens_on,
            registration_closes_on=tournament.registration_closes_on,
            competitor_capacity=0,
        )
        return tournament.id, token, payload


def _register(session, tournament_id, token):
    user = User(id=uuid4(), email="fixture@example.test")
    offering = session.scalar(select(TournamentProduct).where(TournamentProduct.tournament_id == tournament_id))
    price = session.scalar(select(Price).where(Price.product_id == offering.product_id))
    payload = RegistrationCreate(
        **_registration(), acceptance_language="pt", acceptance_token=token,
        tournament_product_id=offering.id, price_id=price.id,
    )
    return create_tournament_registration(
        session, tournament_id, user, payload, "127.0.0.1"
    )


def _cleanup(engine, tournament_id):
    with engine.begin() as connection:
        connection.execute(
            delete(RegistrationAcceptance).where(
                RegistrationAcceptance.registration_id.in_(
                    select(TournamentRegistration.id).where(
                        TournamentRegistration.tournament_id == tournament_id
                    )
                )
            )
        )
        params = {"tournament_id": tournament_id}
        registration_ids = "SELECT id FROM public.tournament_registrations WHERE tournament_id = :tournament_id"
        document_ids = f"SELECT id FROM public.tournament_registration_documents WHERE registration_id IN ({registration_ids})"
        payment_ids = (
            connection.execute(
                text(
                    f"SELECT pp.payment_id FROM public.payment_proof_payments pp JOIN public.payment_proof_reviews r ON r.id = pp.proof_review_id WHERE r.document_id IN ({document_ids})"
                ),
                params,
            )
            .scalars()
            .all()
        )
        order_ids = connection.execute(
            text(f"SELECT oi.order_id FROM public.order_items oi JOIN public.tournament_registrations tr ON tr.order_item_id = oi.id WHERE tr.id IN ({registration_ids})"), params
        ).scalars().all()
        product_ids = connection.execute(
            text("SELECT product_id FROM public.tournament_products WHERE tournament_id = :tournament_id"), params
        ).scalars().all()
        file_ids = (
            connection.execute(
                text(
                    f"SELECT file_id FROM public.tournament_registration_documents WHERE registration_id IN ({registration_ids})"
                ),
                params,
            )
            .scalars()
            .all()
        )
        connection.execute(
            text(
                f"DELETE FROM public.payment_proof_payments WHERE proof_review_id IN (SELECT id FROM public.payment_proof_reviews WHERE document_id IN ({document_ids}))"
            ),
            params,
        )
        connection.execute(
            text(
                f"DELETE FROM public.payment_proof_reviews WHERE document_id IN ({document_ids})"
            ),
            params,
        )
        connection.execute(
            delete(TournamentRegistrationDocument).where(
                TournamentRegistrationDocument.registration_id.in_(
                    select(TournamentRegistration.id).where(
                        TournamentRegistration.tournament_id == tournament_id
                    )
                )
            )
        )
        from app.karlmart.payments.models import Payment

        connection.execute(delete(Payment).where(Payment.id.in_(payment_ids)))
        connection.execute(delete(StoredFile).where(StoredFile.id.in_(file_ids)))
        connection.execute(
            delete(TournamentRegistration).where(
                TournamentRegistration.tournament_id == tournament_id
            )
        )
        from app.karlmart.orders.models import Order, OrderItem

        connection.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
        connection.execute(delete(Order).where(Order.id.in_(order_ids)))
        connection.execute(delete(TournamentProduct).where(TournamentProduct.tournament_id == tournament_id))
        connection.execute(delete(Price).where(Price.product_id.in_(product_ids)))
        connection.execute(delete(Product).where(Product.id.in_(product_ids)))
        connection.execute(delete(Tournament).where(Tournament.id == tournament_id))


def test_delete_waits_for_inflight_registration_and_preserves_it(setup):
    from app.core import db

    engine = db.sync_engine
    tournament_id, token, _payload = _event_and_payload(engine)
    started, release = Event(), Event()
    actor = User(id=uuid4(), app_metadata={"karlbruder_role": "admin"})

    def register():
        with Session(engine) as session:

            @event.listens_for(session, "before_commit")
            def pause(_session):
                started.set()
                assert release.wait(10)

            return _register(session, tournament_id, token).id

    def remove():
        with Session(engine) as session:
            delete_tournament(session, actor, tournament_id)

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            registration = pool.submit(register)
            assert started.wait(10)
            deletion = pool.submit(remove)
            try:
                with pytest.raises(TimeoutError):
                    deletion.result(timeout=0.3)
            finally:
                release.set()
            registration.result(timeout=10)
            with pytest.raises(RegistrationConflictError, match="registrations"):
                deletion.result(timeout=10)
        with Session(engine) as session:
            assert session.get(Tournament, tournament_id) is not None
            assert session.scalar(
                select(TournamentRegistration.id).where(
                    TournamentRegistration.tournament_id == tournament_id
                )
            )
    finally:
        release.set()
        _cleanup(engine, tournament_id)


def test_capacity_edit_waits_for_inflight_confirmation(setup):
    from app.core import db

    engine = db.sync_engine
    tournament_id, token, payload = _event_and_payload(engine)
    actor = User(id=uuid4(), app_metadata={"karlbruder_role": "admin"})
    started, release = Event(), Event()

    with Session(engine) as session:
        registration = _register(session, tournament_id, token)
        registration_id = registration.id
        number = registration.registration_number
        registration.registration_status = "awaiting_payment_confirmation"
        document = TournamentRegistrationDocument(
            registration_id=registration_id,
            document_type="payment_proof",
            file=StoredFile(
                storage_key=f"fixture/{uuid4()}",
                original_file_name="proof.pdf",
                content_type="application/pdf",
                size_bytes=8,
            ),
        )
        session.add(document)
        session.commit()
        document_id = document.id

    def confirm():
        with Session(engine) as session:

            @event.listens_for(session, "before_commit")
            def pause(_session):
                started.set()
                assert release.wait(10)

            return record_payment_review_decision(
                session,
                actor,
                number,
                PaymentReviewDecisionCreate(
                    document_id=document_id,
                    decision="approved",
                    amount_received="1.00",
                    requirements_checked=True,
                ),
                accounts=Mock(),
                sender=Mock(),
                application_base_url=None,
                from_address="fixture@example.test",
            )

    def edit():
        with Session(engine) as session:
            update_tournament(session, actor, tournament_id, payload)

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            confirmation = pool.submit(confirm)
            assert started.wait(10)
            edit_result = pool.submit(edit)
            try:
                with pytest.raises(TimeoutError):
                    edit_result.result(timeout=0.3)
            finally:
                release.set()
            confirmation.result(timeout=10)
            with pytest.raises(RegistrationConflictError, match="confirmed"):
                edit_result.result(timeout=10)
        with Session(engine) as session:
            assert session.get(Tournament, tournament_id).competitor_capacity is None
            assert (
                session.get(TournamentRegistration, registration_id).registration_status
                == "confirmed"
            )
    finally:
        release.set()
        _cleanup(engine, tournament_id)


def test_payment_instructions_keep_fee_deadline_and_pix_consistent_during_edit(setup):
    from app.core import db

    engine = db.sync_engine
    tournament_id, token, payload = _event_and_payload(engine)
    admin = User(id=uuid4(), app_metadata={"karlbruder_role": "admin"})
    old_deadline = datetime(2027, 1, 5, 12, tzinfo=UTC)
    new_deadline = datetime(2027, 1, 10, 12, tzinfo=UTC)

    def update(deadline, pix):
        with Session(engine) as writer:
            update_tournament(
                writer,
                admin,
                tournament_id,
                payload.model_copy(
                    update={
                        "payment_due_at": deadline,
                        "pix_key": pix,
                    }
                ),
            )

    def values(instructions):
        return (
            instructions.registration_fee_amount,
            instructions.payment_due_at,
            instructions.payment_options.pix.pix_key,
        )

    try:
        update(old_deadline, "old-fixture-key")
        with Session(engine) as session:
            registration = _register(session, tournament_id, token)
            number = registration.registration_number
            owner = User(id=registration.user_id, email=registration.email)

        old = (Decimal("100.00"), old_deadline, "old-fixture-key")
        new = (Decimal("100.00"), new_deadline, "new-fixture-key")
        with Session(engine) as session:
            assert values(read_registration_payment_instructions(
                session, tournament_id, number, owner
            )) == old

        with Session(engine) as reader:
            # Keep the ORM instance alive to expose stale identity-map reads.
            loaded_tournament = reader.get(Tournament, tournament_id)
            assert loaded_tournament.payment_due_at == old_deadline
            updated = False

            @event.listens_for(reader, "do_orm_execute", retval=True)
            def commit_between_payment_and_document_reads(state):
                nonlocal updated
                result = state.invoke_statement()
                descriptions = state.statement.column_descriptions if state.is_select else []
                if not updated and any(
                    item.get("entity") is TournamentRegistrationDocument
                    for item in descriptions
                ):
                    updated = True
                    update(new_deadline, "new-fixture-key")
                return result

            during = read_registration_payment_instructions(
                reader, tournament_id, number, owner
            )
            assert updated
            assert values(during) == old
            assert loaded_tournament.payment_due_at == old_deadline
            assert values(read_registration_payment_instructions(
                reader, tournament_id, number, owner
            )) == new

        with Session(engine) as reader:
            assert values(read_registration_payment_instructions(
                reader, tournament_id, number, owner
            )) == new
    finally:
        _cleanup(engine, tournament_id)


def test_policy_publications_serialize_on_tournament(migrated_database):
    from app.core.files.models import ArchivedFile
    from app.tournaments.models import TournamentDocument, TournamentDocumentVersion
    from app.tournaments.services.tournament_policy_documents import publish

    engine = migrated_database
    actor = User(id=uuid4(), app_metadata={"karlbruder_role": "admin"})
    with Session(engine) as session:
        tournament = Tournament(name="Policy race", slug=f"policy-{uuid4().hex}", starts_at=datetime(2027, 1, 17, tzinfo=UTC))
        session.add(tournament)
        session.commit()
        tournament_id = tournament.id

    entered = Event()
    release = Event()
    second_entered = Event()
    keys = [f"tournaments/{tournament_id}/staging/{actor.id}/policy/rules/{uuid4()}" for _ in range(2)]

    def run(key, first):
        storage = Mock()
        storage.head_object.return_value = (12, None)
        storage.read_object_bytes.return_value = b"%PDF-1.4 abc"
        def store(*args):
            if first:
                entered.set()
                assert release.wait(5)
            else:
                second_entered.set()
        storage.store_file.side_effect = store
        with Session(engine) as session:
            return publish(session, storage, tournament_id, "rules", actor, key, "rules.pdf").id

    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            first = executor.submit(run, keys[0], True)
            assert entered.wait(5)
            second = executor.submit(run, keys[1], False)
            assert not second_entered.wait(0.2)
            release.set()
            first_id, second_id = first.result(timeout=5), second.result(timeout=5)
        assert second_id > first_id
        with Session(engine) as session:
            ids = session.scalars(select(TournamentDocumentVersion.id).join(TournamentDocument).where(TournamentDocument.tournament_id == tournament_id).order_by(TournamentDocumentVersion.id.desc())).all()
            assert ids == [second_id, first_id]
    finally:
        release.set()
        with engine.begin() as connection:
            archives = connection.execute(select(TournamentDocumentVersion.archive_id).join(TournamentDocument).where(TournamentDocument.tournament_id == tournament_id)).scalars().all()
            files = connection.execute(select(ArchivedFile.file_id).where(ArchivedFile.id.in_(archives))).scalars().all()
            connection.execute(delete(TournamentDocumentVersion).where(TournamentDocumentVersion.archive_id.in_(archives)))
            connection.execute(delete(TournamentDocument).where(TournamentDocument.tournament_id == tournament_id))
            connection.execute(delete(ArchivedFile).where(ArchivedFile.id.in_(archives)))
            connection.execute(delete(StoredFile).where(StoredFile.id.in_(files)))
            connection.execute(delete(Tournament).where(Tournament.id == tournament_id))
