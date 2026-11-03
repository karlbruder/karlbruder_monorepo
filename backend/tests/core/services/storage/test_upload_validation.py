"""Magic-byte upload validation for private file storage."""

from io import BytesIO

import pytest

from app.core.services.storage.exceptions import (
    UploadDisallowedTypeError,
    UploadEmptyError,
    UploadTooLargeError,
)
from app.core.services.storage.upload_validation import MAX_UPLOAD_BYTES, validate_uploaded_file


def _pdf_payload(extra_bytes: int = 0) -> bytes:
    return b"%PDF-1.4" + (b"x" * extra_bytes)


def test_validate_uploaded_file_accepts_pdf_jpeg_and_png():
    for payload, expected_type in (
        (b"%PDF-1.7\n", "application/pdf"),
        (b"\xff\xd8\xff\xe0" + b"\x00" * 8, "image/jpeg"),
        (b"\x89PNG\r\n\x1a\n" + b"\x00" * 8, "image/png"),
    ):
        content_type, size = validate_uploaded_file(BytesIO(payload))
        assert content_type == expected_type
        assert size == len(payload)


def test_validate_uploaded_file_rejects_text_and_pdf_extension_with_html_body():
    with pytest.raises(UploadDisallowedTypeError):
        validate_uploaded_file(BytesIO(b"plain text"))
    with pytest.raises(UploadDisallowedTypeError):
        validate_uploaded_file(BytesIO(b"<html><body>not a pdf</body></html>"))


def test_validate_uploaded_file_rejects_empty_body():
    with pytest.raises(UploadEmptyError):
        validate_uploaded_file(BytesIO(b""))


def test_validate_uploaded_file_accepts_exactly_ten_megabytes():
    payload = _pdf_payload(MAX_UPLOAD_BYTES - len(b"%PDF-1.4"))
    content_type, size = validate_uploaded_file(BytesIO(payload))
    assert content_type == "application/pdf"
    assert size == MAX_UPLOAD_BYTES


def test_validate_uploaded_file_rejects_ten_megabytes_plus_one_byte():
    payload = _pdf_payload(MAX_UPLOAD_BYTES - len(b"%PDF-1.4") + 1)
    with pytest.raises(UploadTooLargeError):
        validate_uploaded_file(BytesIO(payload))
