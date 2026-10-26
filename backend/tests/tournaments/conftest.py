"""Isolated PostgreSQL database for public-schema integration tests."""

import os
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


@pytest.fixture
def disposable_postgres_engine():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL server")
    parsed_url = make_url(url)
    if not parsed_url.get_backend_name().startswith("postgresql"):
        pytest.fail("TEST_DATABASE_URL must point to PostgreSQL")

    name = f"test_tournaments_{uuid4().hex}"
    admin_engine = create_engine(url, isolation_level="AUTOCOMMIT")
    engine = None
    try:
        with admin_engine.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{name}"'))
        engine = create_engine(parsed_url.set(database=name))
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        with admin_engine.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{name}"'))
        admin_engine.dispose()
