"""Shared archives record uploaded bytes without domain ownership."""

import hashlib
from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app.core.files.models import ArchivedFile
from app.core.files.archiving import archive_file
from app.core.files import FileStorageError


def test_uploaded_document_versions_need_no_tournament_or_source_url(db_session):
    storage = Mock()
    first = archive_file(
        storage,
        body=b"First terms",
        original_file_name="terms.txt",
        content_type="text/plain",
    )
    second = archive_file(
        storage,
        body=b"Revised terms",
        original_file_name="terms.txt",
        content_type="text/plain",
    )
    db_session.add_all([first, second])
    db_session.flush()
    assert first.source_url is None and first.final_url is None
    assert first.file.original_file_name == "terms.txt"
    assert first.sha256 == hashlib.sha256(b"First terms").hexdigest()
    assert first.archived_at is not None
    assert first.file.size_bytes == len(b"First terms")
    assert first.file.storage_key != second.file.storage_key
    assert second.sha256 != first.sha256
    assert storage.store_file.call_args_list[0].args[1] == b"First terms"
    assert len(db_session.scalars(select(ArchivedFile)).all()) == 2




def test_failed_archive_storage_cleans_the_new_key_and_preserves_the_failure():
    storage = Mock()
    storage.store_file.side_effect = FileStorageError("Upload failed")
    storage.delete_file.side_effect = FileStorageError("Cleanup unavailable")
    with pytest.raises(FileStorageError, match="Upload failed"):
        archive_file(
            storage,
            body=b"Fixture",
            original_file_name="fixture.txt",
            content_type="text/plain",
        )
    key = storage.store_file.call_args.args[0]
    storage.delete_file.assert_called_once_with(key)
