"""Shared timestamps track SQLAlchemy updates."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import update

from app.core.files.models import StoredFile


@pytest.mark.parametrize("bulk", [False, True])
def test_updating_mutable_file_preserves_created_at_and_advances_updated_at(
    db_session, bulk
):
    original = datetime(2020, 1, 1, tzinfo=UTC)
    row = StoredFile(
        storage_key=f"timestamps/{uuid4()}",
        original_file_name="before.txt",
        content_type="text/plain",
        size_bytes=1,
        created_at=original,
        updated_at=original,
    )
    db_session.add(row)
    db_session.flush()

    if bulk:
        db_session.execute(
            update(StoredFile)
            .where(StoredFile.id == row.id)
            .values(original_file_name="after.txt")
        )
    else:
        row.original_file_name = "after.txt"
    db_session.flush()
    db_session.refresh(row)

    assert row.created_at == original
    assert row.updated_at > original
    assert row.updated_at.tzinfo is not None
