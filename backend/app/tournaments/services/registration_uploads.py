"""Tournament registration document types and upload-size policy."""

from typing import BinaryIO

from app.core.files.content_types import detect_file_content_type
from app.tournaments.exceptions import (
    UploadDisallowedTypeError,
    UploadEmptyError,
    UploadTooLargeError,
)

MAX_REGISTRATION_DOCUMENT_BYTES = 10 * 1024 * 1024
MAGIC_BYTE_READ_LENGTH = 16
ALLOWED_REGISTRATION_DOCUMENT_TYPES = frozenset(
    {"application/pdf", "image/jpeg", "image/png"}
)


def validate_uploaded_file(body: BinaryIO) -> tuple[str, int, bytes]:
    """Check size and magic bytes, then return ``(content_type, size_bytes, payload)``.

    Reads at most ``MAX_REGISTRATION_DOCUMENT_BYTES + 1`` bytes so a larger body is never fully
    buffered. Raises ``UploadEmptyError``, ``UploadTooLargeError``, or
    ``UploadDisallowedTypeError`` when the upload fails validation.
    """

    payload = body.read(MAX_REGISTRATION_DOCUMENT_BYTES + 1)
    if not payload:
        raise UploadEmptyError()
    if len(payload) > MAX_REGISTRATION_DOCUMENT_BYTES:
        raise UploadTooLargeError()
    content_type = detect_file_content_type(payload)
    if content_type not in ALLOWED_REGISTRATION_DOCUMENT_TYPES:
        raise UploadDisallowedTypeError()
    return content_type, len(payload), payload


def validate_stored_object_size_and_type(size_bytes: int, leading_bytes: bytes) -> str:
    """Validate an object already in S3 using its size and leading bytes."""

    if size_bytes < 1:
        raise UploadEmptyError()
    if size_bytes > MAX_REGISTRATION_DOCUMENT_BYTES:
        raise UploadTooLargeError()
    content_type = detect_file_content_type(leading_bytes)
    if content_type not in ALLOWED_REGISTRATION_DOCUMENT_TYPES:
        raise UploadDisallowedTypeError()
    return content_type
