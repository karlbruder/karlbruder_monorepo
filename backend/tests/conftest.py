"""PostgreSQL lifecycle shared by the backend test suite."""

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session

os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

from database import engine, get_session  # noqa: E402
from main import karlbruder_app  # noqa: E402

ALEMBIC_DIR = Path(__file__).resolve().parents[1] / "alembic"


@pytest.fixture(scope="session")
def migrated_database():
    """Migrate the database named by DATABASE_URL once for this pytest session."""

    config = Config()
    config.set_main_option("script_location", str(ALEMBIC_DIR))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def db_session(migrated_database):
    """Give every test a rollback session and point routes at it.

    The database lives for the whole pytest session. This fixture does not.
    One transaction per test is what keeps rows from leaking into the next test.
    """

    connection = engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )

    def override_session():
        yield session

    karlbruder_app.dependency_overrides[get_session] = override_session
    try:
        yield session
    finally:
        karlbruder_app.dependency_overrides.pop(get_session, None)
        session.close()
        transaction.rollback()
        connection.close()
