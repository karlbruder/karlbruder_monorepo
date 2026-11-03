"""Shared upload size and content-type checks before objects are stored."""

from typing import BinaryIO

from app.core.services.storage.exceptions import (
    UploadDisallowedTypeError,
    UploadEmptyError,
    UploadTooLargeError,
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _detect_content_type(leading_bytes: bytes) -> str | None:
    if leading_bytes.startswith(b"%PDF"):
        return "application/pdf"
    if leading_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if leading_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    return None


def validate_uploaded_file(body: BinaryIO) -> tuple[str, int]:
    """Read at most one byte over the cap, verify magic bytes, return type and size."""

    payload = body.read(MAX_UPLOAD_BYTES + 1)
    if not payload:
        raise UploadEmptyError()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise UploadTooLargeError()
    content_type = _detect_content_type(payload)
    if content_type is None:
        raise UploadDisallowedTypeError()
    return content_type, len(payload)
