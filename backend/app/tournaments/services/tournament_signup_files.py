"""Presigned parental-term uploads and stored object keys for tournament signups."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import HTTPException

from app.core.services.storage import FileStorage, FileStorageError
from app.core.services.storage.exceptions import (
    UploadDisallowedTypeError,
    UploadEmptyError,
    UploadTooLargeError,
)
from app.core.services.storage.services.upload_validation import (
    MAGIC_BYTE_READ_LENGTH,
    validate_stored_object_size_and_type,
)
from app.models import User

PARENTAL_TERM_URL_EXPIRES_SECONDS = 900
PARENTAL_TERM_STAGING_PREFIX = "tournaments/{tournament_id}/staging/{user_id}/parental_term/"
PAYMENT_PROOF_URL_EXPIRES_SECONDS = 900
PAYMENT_PROOF_STAGING_PREFIX = "tournaments/{tournament_id}/staging/{user_id}/payment_proof/"


def build_staged_parental_term_storage_key(tournament_id: int, user_id: UUID) -> str:
    return f"tournaments/{tournament_id}/staging/{user_id}/parental_term/{uuid4()}"


def expected_staged_parental_term_prefix(tournament_id: int, user_id: UUID) -> str:
    return PARENTAL_TERM_STAGING_PREFIX.format(tournament_id=tournament_id, user_id=user_id)


def create_parental_term_upload_url(
    file_storage: FileStorage,
    tournament_id: int,
    user: User,
    *,
    content_type: str = "application/octet-stream",
) -> tuple[str, str, int, dict[str, str]]:
    """Return a presigned PUT URL and the staging ``storage_key`` the client must upload to."""

    storage_key = build_staged_parental_term_storage_key(tournament_id, user.id)
    try:
        upload_url = file_storage.create_presigned_put_url(
            storage_key,
            content_type=content_type,
            expires_in=PARENTAL_TERM_URL_EXPIRES_SECONDS,
        )
    except FileStorageError as error:
        raise HTTPException(status_code=503, detail="File storage unavailable") from error
    required_headers = {"Content-Type": content_type}
    return storage_key, upload_url, PARENTAL_TERM_URL_EXPIRES_SECONDS, required_headers


def validate_staged_parental_term_storage_key(
    storage_key: str,
    tournament_id: int,
    user_id: UUID,
) -> None:
    prefix = expected_staged_parental_term_prefix(tournament_id, user_id)
    if not storage_key.startswith(prefix):
        raise HTTPException(status_code=422, detail="Invalid parental term storage key")


def inspect_staged_parental_term_upload(
    file_storage: FileStorage,
    storage_key: str,
) -> tuple[str, int]:
    """Confirm the staged object exists and matches upload rules."""

    try:
        size_bytes, _reported_type = file_storage.head_object(storage_key)
        leading_bytes = file_storage.read_object_bytes(
            storage_key,
            start=0,
            end=MAGIC_BYTE_READ_LENGTH - 1,
        )
        content_type = validate_stored_object_size_and_type(size_bytes, leading_bytes)
    except UploadEmptyError as error:
        raise HTTPException(status_code=422, detail="Parental term file is empty") from error
    except UploadTooLargeError as error:
        raise HTTPException(status_code=413, detail="Parental term file is too large") from error
    except UploadDisallowedTypeError as error:
        raise HTTPException(
            status_code=415, detail="Parental term file type is not allowed"
        ) from error
    except FileStorageError as error:
        raise HTTPException(status_code=422, detail="Parental term file was not uploaded") from error
    return content_type, size_bytes


def build_final_parental_term_storage_key(tournament_id: int, signup_id: int) -> str:
    return f"tournaments/{tournament_id}/signups/{signup_id}/parental_term/{uuid4()}"


def promote_staged_parental_term_to_signup(
    file_storage: FileStorage,
    *,
    staged_storage_key: str,
    tournament_id: int,
    signup_id: int,
) -> str:
    """Copy the staged object to its permanent key and remove the staging object."""

    final_storage_key = build_final_parental_term_storage_key(tournament_id, signup_id)
    try:
        file_storage.copy_object(staged_storage_key, final_storage_key)
        file_storage.delete_file(staged_storage_key)
    except FileStorageError as error:
        delete_storage_object_quietly(file_storage, final_storage_key)
        raise error
    return final_storage_key


def create_parental_term_download_url(
    file_storage: FileStorage,
    storage_key: str,
) -> tuple[str, str, int]:
    try:
        _size_bytes, content_type = file_storage.head_object(storage_key)
        download_url = file_storage.create_presigned_get_url(
            storage_key,
            expires_in=PARENTAL_TERM_URL_EXPIRES_SECONDS,
        )
    except FileStorageError as error:
        raise HTTPException(status_code=503, detail="File storage unavailable") from error
    return download_url, content_type or "application/octet-stream", PARENTAL_TERM_URL_EXPIRES_SECONDS


def delete_storage_object_quietly(file_storage: FileStorage, storage_key: str) -> None:
    try:
        file_storage.delete_file(storage_key)
    except FileStorageError:
        pass


def build_staged_payment_proof_storage_key(tournament_id: int, user_id: UUID) -> str:
    return f"tournaments/{tournament_id}/staging/{user_id}/payment_proof/{uuid4()}"


def expected_staged_payment_proof_prefix(tournament_id: int, user_id: UUID) -> str:
    return PAYMENT_PROOF_STAGING_PREFIX.format(tournament_id=tournament_id, user_id=user_id)


def create_payment_proof_upload_url(
    file_storage: FileStorage,
    tournament_id: int,
    user: User,
    *,
    content_type: str = "application/octet-stream",
) -> tuple[str, str, int, dict[str, str]]:
    storage_key = build_staged_payment_proof_storage_key(tournament_id, user.id)
    try:
        upload_url = file_storage.create_presigned_put_url(
            storage_key,
            content_type=content_type,
            expires_in=PAYMENT_PROOF_URL_EXPIRES_SECONDS,
        )
    except FileStorageError as error:
        raise HTTPException(status_code=503, detail="File storage unavailable") from error
    required_headers = {"Content-Type": content_type}
    return storage_key, upload_url, PAYMENT_PROOF_URL_EXPIRES_SECONDS, required_headers


def validate_staged_payment_proof_storage_key(
    storage_key: str,
    tournament_id: int,
    user_id: UUID,
) -> None:
    prefix = expected_staged_payment_proof_prefix(tournament_id, user_id)
    if not storage_key.startswith(prefix):
        raise HTTPException(status_code=422, detail="Invalid payment proof storage key")


def inspect_staged_payment_proof_upload(
    file_storage: FileStorage,
    storage_key: str,
) -> tuple[str, int]:
    try:
        size_bytes, _reported_type = file_storage.head_object(storage_key)
        leading_bytes = file_storage.read_object_bytes(
            storage_key,
            start=0,
            end=MAGIC_BYTE_READ_LENGTH - 1,
        )
        content_type = validate_stored_object_size_and_type(size_bytes, leading_bytes)
    except UploadEmptyError as error:
        raise HTTPException(status_code=422, detail="Payment proof file is empty") from error
    except UploadTooLargeError as error:
        raise HTTPException(status_code=413, detail="Payment proof file is too large") from error
    except UploadDisallowedTypeError as error:
        raise HTTPException(
            status_code=415, detail="Payment proof file type is not allowed"
        ) from error
    except FileStorageError as error:
        raise HTTPException(status_code=422, detail="Payment proof file was not uploaded") from error
    return content_type, size_bytes


def build_final_payment_proof_storage_key(tournament_id: int, signup_id: int) -> str:
    return f"tournaments/{tournament_id}/signups/{signup_id}/payment_proof/{uuid4()}"


def promote_staged_payment_proof_to_signup(
    file_storage: FileStorage,
    *,
    staged_storage_key: str,
    tournament_id: int,
    signup_id: int,
) -> str:
    final_storage_key = build_final_payment_proof_storage_key(tournament_id, signup_id)
    try:
        file_storage.copy_object(staged_storage_key, final_storage_key)
        file_storage.delete_file(staged_storage_key)
    except FileStorageError as error:
        delete_storage_object_quietly(file_storage, final_storage_key)
        raise error
    return final_storage_key


def create_payment_proof_download_url(
    file_storage: FileStorage,
    storage_key: str,
) -> tuple[str, str, int]:
    try:
        _size_bytes, content_type = file_storage.head_object(storage_key)
        download_url = file_storage.create_presigned_get_url(
            storage_key,
            expires_in=PAYMENT_PROOF_URL_EXPIRES_SECONDS,
        )
    except FileStorageError as error:
        raise HTTPException(status_code=503, detail="File storage unavailable") from error
    return download_url, content_type or "application/octet-stream", PAYMENT_PROOF_URL_EXPIRES_SECONDS
