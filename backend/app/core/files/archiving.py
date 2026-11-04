"""Archive caller-validated bytes without owning a domain purpose or transaction."""

import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from app.core.files import FileStorage, FileStorageError
from app.core.files.models import StoredFile
from .models import ArchivedFile


def archive_file(
    storage: FileStorage,
    *,
    body: bytes,
    original_file_name: str,
    content_type: str,
    source_url: str | None = None,
    final_url: str | None = None,
) -> ArchivedFile:
    key = f"files/archives/{uuid4()}"
    try:
        storage.store_file(key, body, content_type)
    except FileStorageError:
        try:
            storage.delete_file(key)
        except FileStorageError:
            pass
        raise
    return ArchivedFile(
        file=StoredFile(
            storage_key=key,
            original_file_name=original_file_name,
            content_type=content_type,
            size_bytes=len(body),
        ),
        sha256=hashlib.sha256(body).hexdigest(),
        archived_at=datetime.now(timezone.utc),
        source_url=source_url,
        final_url=final_url,
    )
