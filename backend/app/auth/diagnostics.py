"""Supabase Auth database connectivity diagnostic."""

from sqlalchemy import text

from app.database import create_database_engine
from config import settings


def check_auth_database() -> dict:
    auth_engine = create_database_engine(settings.get_auth_database_url())
    with auth_engine.connect() as conn:
        select_one = conn.execute(text("SELECT 1")).scalar_one()
        auth_schema = conn.execute(
            text(
                """
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = 'auth'
                """
            )
        ).scalar_one_or_none()
        return {
            "status": "ok",
            "auth": "connected",
            "database_url": auth_engine.url.render_as_string(hide_password=True),
            "result": select_one,
            "schema": {
                "auth": auth_schema == "auth",
            },
        }
