"""Async PostgreSQL URL handling retains credentials and uses the async psycopg dialect."""

import asyncio

import pytest
from sqlalchemy.engine import URL

from app.core.db.engine import create_async_engine_instance


@pytest.mark.parametrize(
    "driver", ["postgresql", "postgresql+psycopg", "postgresql+psycopg2"]
)
def test_async_factory_uses_psycopg_without_corrupting_url_credentials(driver):
    url = URL.create(
        driver,
        username="test",
        password="literal@:/secret",
        host="db",
        database="postgres",
    )
    engine = create_async_engine_instance(url)
    try:
        assert engine.dialect.is_async
        assert engine.url.drivername == "postgresql+psycopg"
        assert engine.url.password == "literal@:/secret"
        assert engine.sync_engine.hide_parameters
    finally:
        asyncio.run(engine.dispose())
