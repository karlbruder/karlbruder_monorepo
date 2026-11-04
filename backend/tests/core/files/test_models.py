"""Stored-file metadata is reusable without applying tournament upload policy."""

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.files.models import StoredFile


@pytest.mark.parametrize("size_bytes", [0, 10 * 1024 * 1024 + 1])
def test_stored_file_accepts_non_tournament_types_and_sizes(db_session, size_bytes):
    file = StoredFile(
        storage_key="policy-archive/fixture",
        original_file_name="policy.html",
        content_type="text/html",
        size_bytes=size_bytes,
    )
    db_session.add(file)
    db_session.flush()
    db_session.refresh(file)
    assert file.id is not None
    assert file.created_at is not None
    assert file.content_type == "text/html"
    assert file.size_bytes == size_bytes


def test_stored_file_rejects_duplicate_storage_keys(db_session):
    db_session.add(
        StoredFile(
            storage_key="same-object",
            original_file_name="first.pdf",
            content_type="application/pdf",
            size_bytes=10,
        )
    )
    db_session.flush()
    db_session.add(
        StoredFile(
            storage_key="same-object",
            original_file_name="second.pdf",
            content_type="application/pdf",
            size_bytes=10,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_stored_file_rejects_negative_size(db_session):
    db_session.add(
        StoredFile(
            storage_key="negative-size",
            original_file_name="fixture",
            content_type="application/octet-stream",
            size_bytes=-1,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
