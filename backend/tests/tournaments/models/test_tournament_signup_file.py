"""Database constraints on tournament signup file metadata."""

from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.tournaments.models import Tournament, TournamentSignup, TournamentSignupFile


def _persist_signup(db_session) -> TournamentSignup:
    tournament = Tournament(
        name="File Constraint Tournament",
        slug=f"file-fixture-{uuid4().hex[:8]}",
        starts_at=datetime(2027, 1, 17, 12, 0, tzinfo=UTC),
        is_internal=False,
        next_inscription_serial=1,
    )
    db_session.add(tournament)
    db_session.flush()
    signup = TournamentSignup(
        tournament_id=tournament.id,
        user_id=uuid4(),
        inscription_number=f"KB-{tournament.id}-000001",
        status="awaiting_payment",
        full_name="Fixture Competitor",
        birth_date=date(2000, 1, 1),
        document_type="passport",
        document_id="AB-123",
        document_id_normalized="ab123",
        email="fixture@example.test",
        email_normalized="fixture@example.test",
        phone="+55 11 0000-0000",
        city="Fixture City",
        country="Fixture Country",
        hema_practice_duration="3 years",
        prior_tournaments_count=0,
        emergency_contact_name="Fixture Contact",
        emergency_contact_phone="+55 11 0000-0001",
        declares_truthful_information=True,
        declares_required_equipment=True,
        declares_physically_fit=True,
        accepts_regulation=True,
        accepts_data_processing=True,
        acknowledges_inherent_risks=True,
        accepts_cancellation_policy=True,
        image_use_authorized=False,
        accepted_terms_version="fixture-terms-v1",
        accepted_regulation_version="fixture-regulation-v1",
        accepted_at=datetime(2026, 10, 19, 12, 0, tzinfo=UTC),
        acceptance_ip="127.0.0.1",
    )
    db_session.add(signup)
    db_session.flush()
    return signup


def _file_row(signup_id: int, *, kind: str, storage_key: str) -> TournamentSignupFile:
    return TournamentSignupFile(
        signup_id=signup_id,
        kind=kind,
        storage_key=storage_key,
        original_file_name="scan.pdf",
        content_type="application/pdf",
        size_bytes=128,
    )


def test_signup_file_table_allows_multiple_payment_proofs(db_session):
    signup = _persist_signup(db_session)
    db_session.add(_file_row(signup.id, kind="payment_proof", storage_key="key-proof-1"))
    db_session.add(_file_row(signup.id, kind="payment_proof", storage_key="key-proof-2"))
    db_session.flush()


def test_signup_file_table_allows_only_one_parental_term(db_session):
    signup = _persist_signup(db_session)
    db_session.add(_file_row(signup.id, kind="parental_term", storage_key="key-term-1"))
    db_session.flush()
    db_session.add(_file_row(signup.id, kind="parental_term", storage_key="key-term-2"))
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_signup_file_table_enforces_storage_key_uniqueness(db_session):
    signup = _persist_signup(db_session)
    db_session.add(_file_row(signup.id, kind="payment_proof", storage_key="shared-key"))
    db_session.flush()
    other_signup = _persist_signup(db_session)
    db_session.add(_file_row(other_signup.id, kind="payment_proof", storage_key="shared-key"))
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_signup_file_table_rejects_invalid_kind_and_zero_size(db_session):
    signup = _persist_signup(db_session)
    db_session.add(
        TournamentSignupFile(
            signup_id=signup.id,
            kind="invoice",
            storage_key="key-invalid-kind",
            original_file_name="scan.pdf",
            content_type="application/pdf",
            size_bytes=128,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()
    signup = _persist_signup(db_session)
    db_session.add(
        TournamentSignupFile(
            signup_id=signup.id,
            kind="payment_proof",
            storage_key="key-zero-size",
            original_file_name="scan.pdf",
            content_type="application/pdf",
            size_bytes=0,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
