"""Disposable PostgreSQL schema checks; set TEST_DATABASE_URL to run integration test."""

import os
from datetime import UTC, date, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import MetaData, Table, create_engine, delete, inspect, insert, select, text
from sqlalchemy.exc import IntegrityError

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from tournaments.inscriptions import format_inscription_number  # noqa: E402
from tournaments.models import Tournament, TournamentSignup  # noqa: E402

ALEMBIC_DIR = Path(__file__).resolve().parents[2] / "alembic"


def _config(connection):
    config = Config()
    config.set_main_option("script_location", str(ALEMBIC_DIR))
    config.attributes["connection"] = connection
    return config


def _signup(tournament_id, serial, *, user_id=None, email="fixture@example.test", document="TEST-001", status="awaiting_payment"):
    return {
        "tournament_id": tournament_id,
        "user_id": user_id or uuid4(),
        "inscription_number": format_inscription_number(tournament_id, serial),
        "status": status,
        "full_name": "Test Competitor",
        "birth_date": date(2000, 1, 1),
        "document_type": "passport",
        "document_id": document,
        "document_id_normalized": document.lower(),
        "email": email,
        "email_normalized": email.lower(),
        "phone": "000000000",
        "city": "Fixture City",
        "country": "Fixture Country",
        "hema_practice_start_year": 2020,
        "prior_tournaments_count": 0,
        "emergency_contact_name": "Fixture Contact",
        "emergency_contact_phone": "000000001",
        "declares_truthful_information": True,
        "declares_required_equipment": True,
        "declares_physically_fit": True,
        "accepts_regulation": True,
        "accepts_data_processing": True,
        "acknowledges_inherent_risks": True,
        "accepts_cancellation_policy": True,
        "image_use_authorized": False,
        "accepted_terms_version": "fixture-v1",
        "accepted_regulation_version": "fixture-v1",
        "accepted_at": datetime(2026, 1, 1, tzinfo=UTC),
        "acceptance_ip": "192.0.2.1",
    }


def _rejected(connection, table, values):
    with pytest.raises(IntegrityError), connection.begin_nested():
        connection.execute(insert(table).values(**values))


@pytest.mark.integration
def test_postgres_migration_constraints_and_round_trip():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    engine = create_engine(url)
    if engine.dialect.name != "postgresql":
        pytest.fail("TEST_DATABASE_URL must point to PostgreSQL")

    schema = f"test_tournaments_{uuid4().hex}"
    with engine.begin() as connection:
        connection.execute(text(f"CREATE SCHEMA {schema}"))

    try:
        with engine.begin() as connection:
            connection.execute(text(f"SET search_path TO {schema}"))
            config = _config(connection)
            command.upgrade(config, "head")
            inspector = inspect(connection)
            assert {"tournaments", "tournament_signups", "alembic_version"} <= set(
                inspector.get_table_names(schema=schema)
            )
            assert "auth" not in inspector.get_table_names(schema=schema)
            columns = {column["name"]: column for column in inspector.get_columns("tournament_signups", schema=schema)}
            assert columns["declares_truthful_information"]["nullable"] is False
            assert columns["declares_truthful_information"]["default"] is None
            assert "ck_tournament_signups_truthfulness" in {
                check["name"] for check in inspector.get_check_constraints("tournament_signups", schema=schema)
            }
            indexes = inspector.get_indexes("tournament_signups", schema=schema)
            assert {
                "uq_tournament_signups_active_user",
                "uq_tournament_signups_active_email",
                "uq_tournament_signups_active_document",
            } <= {index["name"] for index in indexes}
            for index in indexes:
                if index["name"].startswith("uq_tournament_signups_active_"):
                    assert "cancelled" in str(index["dialect_options"]["postgresql_where"])

            tournament_id = connection.execute(
                insert(Tournament)
                .values(name="Fixture Tournament", starts_at=datetime(2027, 1, 17, tzinfo=UTC))
                .returning(Tournament.id)
            ).scalar_one()
            assert connection.execute(
                select(Tournament.next_inscription_serial).where(Tournament.id == tournament_id)
            ).scalar_one() == 1
            _rejected(
                connection,
                Tournament,
                {"name": "Invalid capacity", "starts_at": datetime(2027, 1, 17, tzinfo=UTC), "max_competitor_capacity": -1},
            )
            _rejected(
                connection,
                Tournament,
                {"name": "Invalid fee", "starts_at": datetime(2027, 1, 17, tzinfo=UTC), "inscription_fee_amount": -1},
            )

            first = _signup(tournament_id, 1)
            connection.execute(insert(TournamentSignup).values(**first))
            assert connection.execute(
                select(TournamentSignup.status).where(
                    TournamentSignup.inscription_number == first["inscription_number"]
                )
            ).scalar_one() == "awaiting_payment"
            _rejected(connection, TournamentSignup, _signup(tournament_id, 2, email=first["email"], document="OTHER-2"))
            _rejected(connection, TournamentSignup, _signup(tournament_id, 3, email="other3@example.test", document=first["document_id"]))
            _rejected(connection, TournamentSignup, _signup(tournament_id, 4, user_id=first["user_id"], email="other4@example.test", document="OTHER-4"))
            _rejected(connection, TournamentSignup, _signup(tournament_id, 5, email="other5@example.test", document="OTHER-5", status="invalid"))
            _rejected(connection, TournamentSignup, _signup(tournament_id, 6, email="other6@example.test", document="OTHER-6", status="confirmed") | {"prior_tournaments_count": -1})
            _rejected(connection, TournamentSignup, _signup(tournament_id, 7, email="other7@example.test", document="OTHER-7") | {"declares_physically_fit": False})
            _rejected(connection, TournamentSignup, _signup(tournament_id, 9, email="other9@example.test", document="OTHER-9") | {"declares_truthful_information": False})
            _rejected(connection, TournamentSignup, _signup(tournament_id, 10, email="other10@example.test", document="OTHER-10") | {"declares_truthful_information": None})
            connection.execute(insert(TournamentSignup).values(**_signup(tournament_id, 8, email=first["email"], document=first["document_id"], status="cancelled")))

            second_tournament_id = connection.execute(
                insert(Tournament)
                .values(name="Second Fixture", starts_at=datetime(2027, 2, 1, tzinfo=UTC))
                .returning(Tournament.id)
            ).scalar_one()
            connection.execute(insert(TournamentSignup).values(**_signup(second_tournament_id, 1, user_id=first["user_id"], email=first["email"], document=first["document_id"])))
            connection.execute(delete(TournamentSignup))
            command.downgrade(config, "20261019_0001")
            assert "declares_truthful_information" not in {
                column["name"] for column in inspect(connection).get_columns("tournament_signups", schema=schema)
            }
            command.upgrade(config, "head")
            assert "declares_truthful_information" in {
                column["name"] for column in inspect(connection).get_columns("tournament_signups", schema=schema)
            }
            command.downgrade(config, "base")
            assert not {"tournaments", "tournament_signups"} & set(
                inspect(connection).get_table_names(schema=schema)
            )
    finally:
        with engine.begin() as connection:
            connection.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
        engine.dispose()


@pytest.mark.integration
def test_existing_signup_blocks_truthfulness_migration_without_fabricating_consent():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    engine = create_engine(url)
    if engine.dialect.name != "postgresql":
        pytest.fail("TEST_DATABASE_URL must point to PostgreSQL")

    schema = f"test_tournaments_{uuid4().hex}"
    with engine.begin() as connection:
        connection.execute(text(f"CREATE SCHEMA {schema}"))

    try:
        with engine.begin() as connection:
            connection.execute(text(f"SET search_path TO {schema}"))
            config = _config(connection)
            command.upgrade(config, "20261019_0001")
            tournament_id = connection.execute(
                insert(Tournament)
                .values(name="Preexisting fixture", starts_at=datetime(2027, 1, 17, tzinfo=UTC))
                .returning(Tournament.id)
            ).scalar_one()
            old_signup = Table("tournament_signups", MetaData(), autoload_with=connection)
            values = _signup(tournament_id, 1)
            values.pop("declares_truthful_information")
            connection.execute(insert(old_signup).values(**values))

            with pytest.raises(IntegrityError), connection.begin_nested():
                command.upgrade(config, "head")

            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "20261019_0001"
            assert connection.scalar(text("SELECT count(*) FROM tournament_signups")) == 1
            assert "declares_truthful_information" not in {
                column["name"] for column in inspect(connection).get_columns("tournament_signups", schema=schema)
            }
    finally:
        with engine.begin() as connection:
            connection.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
        engine.dispose()
