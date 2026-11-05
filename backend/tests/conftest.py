"""PostgreSQL lifecycle shared by the backend test suite."""

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session

from app.core.db import create_sync_engine, get_session
from app.main import karlbruder_app
from config import settings

ALEMBIC_DIR = Path(__file__).resolve().parents[1] / "alembic"


@pytest.fixture(scope="session")
def migrated_database():
    """Migrate the configured domain database once for this pytest session."""

    engine = create_sync_engine(settings.get_database_url())
    config = Config()
    config.set_main_option("script_location", str(ALEMBIC_DIR))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def db_session(migrated_database):
    """Give every test a rollback session and point routes at it.

    The database lives for the whole pytest session. This fixture does not.
    One transaction per test is what keeps rows from leaking into the next test.
    """

    connection = migrated_database.connect()
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
