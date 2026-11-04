"""Presigned parental-consent-form uploads and stored object keys for tournament registrations."""

from __future__ import annotations

from collections.abc import Callable
from uuid import UUID, uuid4


from app.core.files import FileStorage, FileStorageError
from app.tournaments.exceptions import (
    UploadDisallowedTypeError,
    UploadEmptyError,
    UploadTooLargeError,
)
from app.tournaments.services.registration_uploads import (
    MAGIC_BYTE_READ_LENGTH,
    validate_stored_object_size_and_type,
)
from app.tournaments.exceptions import (
    RegistrationDocumentInvalidError,
    RegistrationDocumentTooLargeError,
    RegistrationDocumentTypeNotAllowedError,
    TournamentError,
)
from app.models import User

PARENTAL_CONSENT_FORM_URL_EXPIRES_SECONDS = 900
PARENTAL_CONSENT_FORM_STAGING_PREFIX = (
    "tournaments/{tournament_id}/staging/{user_id}/parental_consent_form/"
)
PAYMENT_PROOF_URL_EXPIRES_SECONDS = 900
PAYMENT_PROOF_STAGING_PREFIX = (
    "tournaments/{tournament_id}/staging/{user_id}/payment_proof/"
)


def build_staged_parental_consent_form_storage_key(
    tournament_id: int, user_id: UUID
) -> str:
    return (
        f"tournaments/{tournament_id}/staging/{user_id}/parental_consent_form/{uuid4()}"
    )


def expected_staged_parental_consent_form_prefix(
    tournament_id: int, user_id: UUID
) -> str:
    return PARENTAL_CONSENT_FORM_STAGING_PREFIX.format(
        tournament_id=tournament_id, user_id=user_id
    )


def create_parental_consent_form_upload_url(
    file_storage: FileStorage,
    tournament_id: int,
    user: User,
    *,
    content_type: str = "application/octet-stream",
) -> tuple[str, str, int, dict[str, str]]:
    """Return a presigned PUT URL and the staging ``storage_key`` the client must upload to."""

    storage_key = build_staged_parental_consent_form_storage_key(tournament_id, user.id)
    try:
        upload_url = file_storage.create_presigned_put_url(
            storage_key,
            content_type=content_type,
            expires_in=PARENTAL_CONSENT_FORM_URL_EXPIRES_SECONDS,
        )
    except FileStorageError as error:
        raise FileStorageError("File storage unavailable") from error
    required_headers = {"Content-Type": content_type}
    return (
        storage_key,
        upload_url,
        PARENTAL_CONSENT_FORM_URL_EXPIRES_SECONDS,
        required_headers,
    )


def validate_staged_parental_consent_form_storage_key(
    storage_key: str,
    tournament_id: int,
    user_id: UUID,
) -> None:
    prefix = expected_staged_parental_consent_form_prefix(tournament_id, user_id)
    if not storage_key.startswith(prefix):
        raise RegistrationDocumentInvalidError(
            "Invalid parental consent form storage key"
        )


def inspect_staged_parental_consent_form_upload(
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
        raise RegistrationDocumentInvalidError(
            "Parental consent form file is empty"
        ) from error
    except UploadTooLargeError as error:
        raise RegistrationDocumentTooLargeError(
            "Parental consent form file is too large"
        ) from error
    except UploadDisallowedTypeError as error:
        raise RegistrationDocumentTypeNotAllowedError(
            "Parental consent form file type is not allowed"
        ) from error
    except FileStorageError as error:
        raise RegistrationDocumentInvalidError(
            "Parental consent form file was not uploaded"
        ) from error
    return content_type, size_bytes


def build_final_parental_consent_form_storage_key(
    tournament_id: int, registration_id: int
) -> str:
    return f"tournaments/{tournament_id}/registrations/{registration_id}/parental_consent_form/{uuid4()}"


def _copy_staged_object_then_confirm_promoted_upload(
    file_storage: FileStorage,
    staged_storage_key: str,
    final_storage_key: str,
    confirm_promoted_upload: Callable[[FileStorage, str], tuple[str, int]],
) -> tuple[str, int]:
    """Copy staging, then accept the permanent object only if those copied bytes pass."""

    try:
        file_storage.copy_object(staged_storage_key, final_storage_key)
        content_type, size_bytes = confirm_promoted_upload(
            file_storage, final_storage_key
        )
        file_storage.delete_file(staged_storage_key)
    except FileStorageError as error:
        delete_storage_object_quietly(file_storage, final_storage_key)
        raise error
    except TournamentError:
        delete_storage_object_quietly(file_storage, final_storage_key)
        raise
    return content_type, size_bytes


def promote_staged_parental_consent_form_to_registration(
    file_storage: FileStorage,
    *,
    staged_storage_key: str,
    tournament_id: int,
    registration_id: int,
) -> tuple[str, str, int]:
    """Copy the staged term and return the permanent key plus the copied object's type and size."""

    final_storage_key = build_final_parental_consent_form_storage_key(
        tournament_id, registration_id
    )
    content_type, size_bytes = _copy_staged_object_then_confirm_promoted_upload(
        file_storage,
        staged_storage_key,
        final_storage_key,
        inspect_staged_parental_consent_form_upload,
    )
    return final_storage_key, content_type, size_bytes


def create_parental_consent_form_download_url(
    file_storage: FileStorage,
    storage_key: str,
) -> tuple[str, str, int]:
    try:
        _size_bytes, content_type = file_storage.head_object(storage_key)
        download_url = file_storage.create_presigned_get_url(
            storage_key,
            expires_in=PARENTAL_CONSENT_FORM_URL_EXPIRES_SECONDS,
        )
    except FileStorageError as error:
        raise FileStorageError("File storage unavailable") from error
    return (
        download_url,
        content_type or "application/octet-stream",
        PARENTAL_CONSENT_FORM_URL_EXPIRES_SECONDS,
    )


def delete_storage_object_quietly(file_storage: FileStorage, storage_key: str) -> None:
    try:
        file_storage.delete_file(storage_key)
    except FileStorageError:
        pass


def build_staged_payment_proof_storage_key(tournament_id: int, user_id: UUID) -> str:
    return f"tournaments/{tournament_id}/staging/{user_id}/payment_proof/{uuid4()}"


def expected_staged_payment_proof_prefix(tournament_id: int, user_id: UUID) -> str:
    return PAYMENT_PROOF_STAGING_PREFIX.format(
        tournament_id=tournament_id, user_id=user_id
    )


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
        raise FileStorageError("File storage unavailable") from error
    required_headers = {"Content-Type": content_type}
    return storage_key, upload_url, PAYMENT_PROOF_URL_EXPIRES_SECONDS, required_headers


def validate_staged_payment_proof_storage_key(
    storage_key: str,
    tournament_id: int,
    user_id: UUID,
) -> None:
    prefix = expected_staged_payment_proof_prefix(tournament_id, user_id)
    if not storage_key.startswith(prefix):
        raise RegistrationDocumentInvalidError("Invalid payment proof storage key")


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
        raise RegistrationDocumentInvalidError("Payment proof file is empty") from error
    except UploadTooLargeError as error:
        raise RegistrationDocumentTooLargeError(
            "Payment proof file is too large"
        ) from error
    except UploadDisallowedTypeError as error:
        raise RegistrationDocumentTypeNotAllowedError(
            "Payment proof file type is not allowed"
        ) from error
    except FileStorageError as error:
        raise RegistrationDocumentInvalidError(
            "Payment proof file was not uploaded"
        ) from error
    return content_type, size_bytes


def build_final_payment_proof_storage_key(
    tournament_id: int, registration_id: int
) -> str:
    return f"tournaments/{tournament_id}/registrations/{registration_id}/payment_proof/{uuid4()}"


def promote_staged_payment_proof_to_registration(
    file_storage: FileStorage,
    *,
    staged_storage_key: str,
    tournament_id: int,
    registration_id: int,
) -> tuple[str, str, int]:
    """Copy the staged proof and return the permanent key plus the copied object's type and size."""

    final_storage_key = build_final_payment_proof_storage_key(
        tournament_id, registration_id
    )
    content_type, size_bytes = _copy_staged_object_then_confirm_promoted_upload(
        file_storage,
        staged_storage_key,
        final_storage_key,
        inspect_staged_payment_proof_upload,
    )
    return final_storage_key, content_type, size_bytes


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
        raise FileStorageError("File storage unavailable") from error
    return (
        download_url,
        content_type or "application/octet-stream",
        PAYMENT_PROOF_URL_EXPIRES_SECONDS,
    )
