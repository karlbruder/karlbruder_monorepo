import os

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is required. Configure it in the application environment."
        )
    return database_url


def get_auth_database_url() -> str:
    auth_database_url = os.getenv("AUTH_DATABASE_URL")
    if not auth_database_url:
        raise RuntimeError(
            "AUTH_DATABASE_URL is required for the Supabase Auth health check."
        )
    return auth_database_url


def create_database_engine(database_url: str | URL | None = None) -> Engine:
    return create_engine(
        database_url or get_database_url(),
        pool_pre_ping=True,
    )


def get_auth_database_engine() -> Engine:
    """Create the Supabase Auth engine only when its health check is requested."""
    return create_database_engine(get_auth_database_url())


engine = create_database_engine()
