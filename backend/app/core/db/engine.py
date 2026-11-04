"""Construct database engines without initializing process resources on import."""

from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def create_sync_engine(
    database_url: str | URL,
    echo: bool = False,
    echo_pool: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
    pool_pre_ping: bool = True,
    pool_recycle: int = 3600,
    pool_timeout: float = 30.0,
    connect_args: dict[str, Any] | None = None,
) -> Engine:
    return create_engine(
        database_url,
        echo=echo,
        echo_pool=echo_pool,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=pool_pre_ping,
        pool_recycle=pool_recycle,
        pool_timeout=pool_timeout,
        connect_args=connect_args or {},
        hide_parameters=True,
    )


def create_async_engine_instance(
    database_url: str | URL,
    echo: bool = False,
    echo_pool: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
    pool_pre_ping: bool = True,
    pool_recycle: int = 3600,
    pool_timeout: float = 30.0,
    connect_args: dict[str, Any] | None = None,
) -> AsyncEngine:
    url = make_url(database_url)
    if url.drivername in {"postgresql", "postgresql+psycopg2"}:
        url = url.set(drivername="postgresql+psycopg")
    return create_async_engine(
        url,
        echo=echo,
        echo_pool=echo_pool,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=pool_pre_ping,
        pool_recycle=pool_recycle,
        pool_timeout=pool_timeout,
        connect_args=connect_args or {},
        hide_parameters=True,
    )
