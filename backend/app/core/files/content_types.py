"""Recognize file signatures without choosing a domain upload policy."""


def detect_file_content_type(leading_bytes: bytes) -> str | None:
    if leading_bytes.startswith(b"%PDF"):
        return "application/pdf"
    if leading_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if leading_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    return None
