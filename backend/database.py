import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, URL, make_url

LOCAL_COMPOSE_DATABASE_HOST = "db"
SUPABASE_DATABASE_HOST_SUFFIX = ".supabase.com"


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is required. Configure it in the application environment."
        )
    return database_url


def create_database_engine(database_url: str | URL | None = None) -> Engine:
    return create_engine(
        database_url or get_database_url(),
        pool_pre_ping=True,
    )


def classify_database_target(database_url: str | URL) -> str:
    """Return a safe label for the configured database without exposing its URL."""
    parsed_url = make_url(database_url)
    host = (parsed_url.host or "").lower()

    if host == LOCAL_COMPOSE_DATABASE_HOST:
        return "local"
    if host.endswith(SUPABASE_DATABASE_HOST_SUFFIX):
        return "supabase"
    return "external"


engine = create_database_engine()
