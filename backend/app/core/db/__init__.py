"""Database API. Engine and session resources are owned by application lifespan."""

from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session, sessionmaker

from .base import Base, BaseModel
from .engine import create_async_engine_instance, create_sync_engine
from .session import (
    create_async_session_maker,
    create_sync_session_maker,
    get_async_session,
    get_session,
    get_sync_session,
)

sync_engine: Engine | None = None
async_engine: AsyncEngine | None = None
sync_session_maker: sessionmaker[Session] | None = None
async_session_maker: async_sessionmaker[AsyncSession] | None = None

__all__ = [
    "Base",
    "BaseModel",
    "create_sync_engine",
    "create_async_engine_instance",
    "create_sync_session_maker",
    "create_async_session_maker",
    "get_session",
    "get_sync_session",
    "get_async_session",
    "sync_engine",
    "async_engine",
    "sync_session_maker",
    "async_session_maker",
]
