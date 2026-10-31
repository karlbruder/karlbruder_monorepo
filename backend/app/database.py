from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import settings


class Base(DeclarativeBase):
    """Metadata for Karlbrüder domain tables in the public schema."""


def create_database_engine(database_url: str | URL | None = None) -> Engine:
    return create_engine(
        database_url or settings.get_database_url(),
        pool_pre_ping=True,
        hide_parameters=True,
    )


def get_auth_database_engine() -> Engine:
    """Create the Supabase Auth engine only when its health check is requested."""
    return create_database_engine(settings.get_auth_database_url())


engine = create_database_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Provide one transaction boundary per API request."""

    with SessionLocal() as session:
        yield session
