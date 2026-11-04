"""Sync and async scopes close sessions without committing workflow data."""

import asyncio
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.core.db import (
    create_async_engine_instance,
    create_async_session_maker,
    create_sync_session_maker,
    get_async_session,
    get_sync_session,
)
from app.core.files.models import StoredFile
from config import settings


def _file(key):
    return StoredFile(
        storage_key=key,
        original_file_name="fixture.txt",
        content_type="text/plain",
        size_bytes=1,
    )


@pytest.mark.parametrize("fail", [False, True])
def test_sync_scope_rolls_back_uncommitted_rows_on_close(
    migrated_database, db_session, fail
):
    key = f"sync-scope/{uuid4()}"
    maker = create_sync_session_maker(migrated_database)

    def run():
        with get_sync_session(maker) as session:
            session.add(_file(key))
            session.flush()
            if fail:
                raise ValueError("workflow failed")

    if fail:
        with pytest.raises(ValueError, match="workflow failed"):
            run()
    else:
        run()

    assert (
        db_session.scalar(select(StoredFile.id).where(StoredFile.storage_key == key))
        is None
    )


@pytest.mark.parametrize("fail", [False, True])
def test_async_scope_uses_postgresql_and_rolls_back_uncommitted_rows(db_session, fail):
    key = f"async-scope/{uuid4()}"

    async def run():
        engine = create_async_engine_instance(settings.get_database_url())
        try:
            maker = create_async_session_maker(engine)
            async with get_async_session(maker) as session:
                session.add(_file(key))
                await session.flush()
                assert (
                    await session.scalar(
                        select(StoredFile.id).where(StoredFile.storage_key == key)
                    )
                    is not None
                )
                if fail:
                    raise ValueError("workflow failed")
        finally:
            await engine.dispose()

    if fail:
        with pytest.raises(ValueError, match="workflow failed"):
            asyncio.run(run())
    else:
        asyncio.run(run())

    assert (
        db_session.scalar(select(StoredFile.id).where(StoredFile.storage_key == key))
        is None
    )
