"""Shared timestamps track SQLAlchemy updates and remain protected on evidence."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import text, update
from sqlalchemy.exc import IntegrityError

from app.core.files.models import StoredFile
from app.core.files.archiving import archive_file
from unittest.mock import Mock


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


def test_archive_timestamps_are_initialized_and_cannot_be_rewritten(db_session):
    archive = archive_file(
        Mock(),
        body=b"Timestamp evidence",
        original_file_name="evidence.txt",
        content_type="text/plain",
    )
    db_session.add(archive)
    db_session.flush()

    assert archive.created_at.tzinfo is not None
    assert archive.updated_at.tzinfo is not None
    assert archive.file.created_at.tzinfo is not None
    assert archive.file.updated_at.tzinfo is not None
    with pytest.raises(IntegrityError, match="immutable"):
        with db_session.begin_nested():
            db_session.execute(
                text("UPDATE public.archived_files SET updated_at=now() WHERE id=:id"),
                {"id": archive.id},
            )
