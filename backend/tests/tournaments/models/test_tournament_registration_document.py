"""Database constraints on tournament registration file metadata."""

from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError

from app.core.files.models import StoredFile
from app.tournaments.models import (
    Tournament,
    TournamentRegistration,
    TournamentRegistrationDocument,
)


def _persist_registration(db_session) -> TournamentRegistration:
    tournament = Tournament(
        name="File Constraint Tournament",
        slug=f"file-fixture-{uuid4().hex[:8]}",
        starts_at=datetime(2027, 1, 17, 12, 0, tzinfo=UTC),
        is_internal=False,
        next_registration_number=1,
    )
    db_session.add(tournament)
    db_session.flush()
    registration = TournamentRegistration(
        tournament_id=tournament.id,
        user_id=uuid4(),
        registration_number=f"KB-{tournament.id}-000001",
        registration_status="awaiting_payment",
        full_name="Fixture Competitor",
        birth_date=date(2000, 1, 1),
        identity_document_type="passport",
        identity_document_number="AB-123",
        identity_document_number_normalized="ab123",
        email="fixture@example.test",
        email_normalized="fixture@example.test",
        phone="+55 11 0000-0000",
        city="Fixture City",
        country="Fixture Country",
        hema_experience_description="3 years",
        previous_tournament_count=0,
        emergency_contact_name="Fixture Contact",
        emergency_contact_phone="+55 11 0000-0001",
    )
    db_session.add(registration)
    db_session.flush()
    return registration


def _file_row(
    registration_id: int, *, document_type: str, storage_key: str
) -> TournamentRegistrationDocument:
    return TournamentRegistrationDocument(
        registration_id=registration_id,
        document_type=document_type,
        file=StoredFile(
            storage_key=storage_key,
            original_file_name="scan.pdf",
            content_type="application/pdf",
            size_bytes=128,
        ),
    )


def test_registration_file_table_allows_multiple_payment_proofs(db_session):
    registration = _persist_registration(db_session)
    db_session.add(
        _file_row(
            registration.id, document_type="payment_proof", storage_key="key-proof-1"
        )
    )
    db_session.add(
        _file_row(
            registration.id, document_type="payment_proof", storage_key="key-proof-2"
        )
    )
    db_session.flush()


def test_registration_file_table_allows_only_one_parental_consent_form(
    db_session,
):
    registration = _persist_registration(db_session)
    db_session.add(
        _file_row(
            registration.id,
            document_type="parental_consent_form",
            storage_key="key-term-1",
        )
    )
    db_session.flush()
    db_session.add(
        _file_row(
            registration.id,
            document_type="parental_consent_form",
            storage_key="key-term-2",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_document_cannot_reuse_a_file_already_submitted_to_another_registration(
    db_session,
):
    first = _persist_registration(db_session)
    original = _file_row(
        first.id, document_type="payment_proof", storage_key="original-object"
    )
    db_session.add(original)
    db_session.flush()
    other = _persist_registration(db_session)
    db_session.add(
        TournamentRegistrationDocument(
            registration_id=other.id,
            file_id=original.file_id,
            document_type="payment_proof",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_document_rejects_invalid_document_type(db_session):
    registration = _persist_registration(db_session)
    db_session.add(
        _file_row(registration.id, document_type="invoice", storage_key="invalid-type")
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_document_requires_an_existing_stored_file(db_session):
    registration = _persist_registration(db_session)
    db_session.add(
        TournamentRegistrationDocument(
            registration_id=registration.id,
            file_id=999999999,
            document_type="payment_proof",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_referenced_file_cannot_be_deleted(db_session):
    registration = _persist_registration(db_session)
    document = _file_row(
        registration.id, document_type="payment_proof", storage_key="retained-proof"
    )
    db_session.add(document)
    db_session.flush()
    with pytest.raises(IntegrityError):
        db_session.execute(delete(StoredFile).where(StoredFile.id == document.file_id))
