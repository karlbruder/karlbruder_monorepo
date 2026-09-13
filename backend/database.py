import os
from collections.abc import Iterator
from functools import cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Base shared by SQLAlchemy models."""

    pass


def require_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"{name} is required")

    return value


def create_database_engine(database_url: str) -> Engine:
    return create_engine(
        database_url,
        pool_pre_ping=True,
    )


# Banco principal da aplicação.
engine = create_database_engine(require_env("DATABASE_URL"))

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Iterator[Session]:
    """Provides a SQLAlchemy session for a FastAPI request."""

    with SessionLocal() as session:
        yield session


@cache
def get_auth_database_engine() -> Engine:
    """Creates the Supabase Auth engine only when its health check is requested."""

    return create_database_engine(require_env("AUTH_DATABASE_URL"))