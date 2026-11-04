"""Session factories and scopes. Workflow services own commit and rollback."""

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session, sessionmaker

from app.core import db


def create_sync_session_maker(
    engine: Engine,
    autoflush: bool = True,
    autobegin: bool = True,
    expire_on_commit: bool = False,
) -> sessionmaker[Session]:
    return sessionmaker(
        bind=engine,
        autoflush=autoflush,
        autobegin=autobegin,
        expire_on_commit=expire_on_commit,
    )


def create_async_session_maker(
    engine: AsyncEngine,
    autoflush: bool = True,
    autobegin: bool = True,
    expire_on_commit: bool = False,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=engine,
        autoflush=autoflush,
        autobegin=autobegin,
        expire_on_commit=expire_on_commit,
    )


@contextmanager
def get_sync_session(session_maker: sessionmaker[Session]) -> Iterator[Session]:
    with session_maker() as session:
        yield session


@asynccontextmanager
async def get_async_session(
    session_maker: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with session_maker() as session:
        yield session


def get_session() -> Iterator[Session]:
    if db.sync_session_maker is None:
        raise RuntimeError(
            "Database sessions are not initialized. Run application lifespan first."
        )
    with get_sync_session(db.sync_session_maker) as session:
        yield session
