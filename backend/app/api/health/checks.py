"""Database connectivity checks for API health endpoints."""

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.core import db
from app.core.db.engine import create_sync_engine
from config import settings


def _check_database(database_engine: Engine, schema: str, connection_key: str) -> dict:
    with database_engine.connect() as connection:
        result = connection.execute(text("SELECT 1")).scalar_one()
        found_schema = connection.execute(
            text(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name = :schema"
            ),
            {"schema": schema},
        ).scalar_one_or_none()
        return {
            "status": "ok",
            connection_key: "connected",
            "database_url": database_engine.url.render_as_string(hide_password=True),
            "result": result,
            "schema": {schema: found_schema == schema},
        }


def check_domain_database() -> dict:
    if db.sync_engine is None:
        raise RuntimeError("Database engine is not initialized.")
    return _check_database(db.sync_engine, "public", "database")


def check_auth_database() -> dict:
    auth_engine = create_sync_engine(settings.get_auth_database_url())
    try:
        return _check_database(auth_engine, "auth", "auth")
    finally:
        auth_engine.dispose()
