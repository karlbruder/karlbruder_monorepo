"""Publish and retrieve tournament document archive versions."""

from typing import Literal
from uuid import uuid4

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.exceptions import AdminAccessRequiredException, InvalidCredentialsException
from app.auth.models import AnonymousUser, User
from app.auth.supabase.roles import get_application_role
from app.core.files import FileStorage
from app.core.files.archiving import archive_file
from app.core.files.models import ArchivedFile
from app.tournaments.exceptions import (
    RegistrationDocumentInvalidError,
    RegistrationDocumentTooLargeError,
    RegistrationDocumentTypeNotAllowedError,
    RegistrationResourceNotFoundError,
    UploadDisallowedTypeError,
    UploadEmptyError,
    UploadTooLargeError,
)
from app.tournaments.models import TournamentDocument, TournamentDocumentVersion
from app.tournaments.services.registration_documents import delete_storage_object_quietly
from app.tournaments.services.registration_uploads import (
    MAX_REGISTRATION_DOCUMENT_BYTES,
    validate_stored_object_size_and_type,
)
from app.tournaments.services.tournament_catalog import load_visible_tournament

PolicyPurpose = Literal["rules", "cancellation_policy"]
URL_EXPIRY = 900
logger = structlog.get_logger()


def _require_admin(user: User) -> None:
    if get_application_role(user) != "admin":
        raise AdminAccessRequiredException()


def _prefix(tournament_id: int, purpose: PolicyPurpose | None, user: User) -> str:
    document_path = f"policy/{purpose}" if purpose else "documents"
    return f"tournaments/{tournament_id}/staging/{user.id}/{document_path}/"


def create_upload(session: Session, storage: FileStorage, tournament_id: int, purpose: PolicyPurpose | None, user: User):
    _require_admin(user)
    load_visible_tournament(session, tournament_id, user)
    key = _prefix(tournament_id, purpose, user) + str(uuid4())
    content_type = "application/octet-stream"
    return {"storage_key": key, "upload_url": storage.create_presigned_put_url(key, content_type=content_type, expires_in=URL_EXPIRY), "expires_in_seconds": URL_EXPIRY, "required_headers": {"Content-Type": content_type}}


def publish(
    session: Session,
    storage: FileStorage,
    tournament_id: int,
    purpose: PolicyPurpose | None,
    user: User,
    key: str,
    filename: str,
    *,
    title: str | None = None,
) -> TournamentDocumentVersion:
    _require_admin(user)
    load_visible_tournament(session, tournament_id, user, lock=True)
    if purpose is None:
        title = (title or "").strip()
        if not title or len(title) > 200:
            raise RegistrationDocumentInvalidError("Invalid document title")
    else:
        title = "Rules" if purpose == "rules" else "Cancellation policy"
    prefix = _prefix(tournament_id, purpose, user)
    if not key.startswith(prefix) or "/" in key[len(prefix):] or not key[len(prefix):]:
        raise RegistrationDocumentInvalidError("Invalid document storage key")
    archive_key = None
    commit_started = False
    try:
        size, _ = storage.head_object(key)
        if size < 1:
            raise UploadEmptyError()
        if size > MAX_REGISTRATION_DOCUMENT_BYTES:
            raise UploadTooLargeError()
        payload = storage.read_object_bytes(key, start=0, end=MAX_REGISTRATION_DOCUMENT_BYTES)
        content_type = validate_stored_object_size_and_type(len(payload), payload[:16])
        archive = archive_file(storage, body=payload, original_file_name=filename, content_type=content_type)
        archive_key = archive.file.storage_key
        document = None
        if purpose is not None:
            document = session.scalar(
                select(TournamentDocument).where(
                    TournamentDocument.tournament_id == tournament_id,
                    TournamentDocument.purpose == purpose,
                )
            )
        if document is None:
            document = TournamentDocument(
                tournament_id=tournament_id,
                purpose=purpose,
                title=title,
            )
            session.add(document)
        version = TournamentDocumentVersion(document=document, archive=archive)
        session.add(version)
        session.flush()
        commit_started = True
        session.commit()
    except UploadEmptyError as error:
        session.rollback()
        raise RegistrationDocumentInvalidError("Document file is empty") from error
    except UploadTooLargeError as error:
        session.rollback()
        raise RegistrationDocumentTooLargeError("Document file is too large") from error
    except UploadDisallowedTypeError as error:
        session.rollback()
        raise RegistrationDocumentTypeNotAllowedError("Document file type is not allowed") from error
    except Exception:
        session.rollback()
        if archive_key:
            # An interrupted commit can already have made this archive reachable.
            if commit_started:
                logger.warning("policy_archive_retained_after_commit_error", archive_key=archive_key)
            else:
                delete_storage_object_quietly(storage, archive_key)
        raise
    finally:
        delete_storage_object_quietly(storage, key)
    return version


def current_documents(session: Session, tournament_id: int, user: User | AnonymousUser):
    versions = _current_versions(session, tournament_id, user, additional=False)
    return {version.document.purpose: version for version in versions}


def additional_documents(session: Session, tournament_id: int, user: User):
    return _current_versions(session, tournament_id, user, additional=True)


def _current_versions(
    session: Session, tournament_id: int, user: User | AnonymousUser, *, additional: bool,
) -> list[TournamentDocumentVersion]:
    if additional and isinstance(user, AnonymousUser):
        raise InvalidCredentialsException()
    load_visible_tournament(session, tournament_id, user)
    purpose = TournamentDocument.purpose
    documents = session.scalars(
        select(TournamentDocument)
        .where(TournamentDocument.tournament_id == tournament_id, purpose.is_(None) if additional else purpose.is_not(None))
        .order_by(TournamentDocument.id)
        .options(selectinload(TournamentDocument.versions).joinedload(TournamentDocumentVersion.archive).joinedload(ArchivedFile.file))
        .execution_options(populate_existing=True)
    ).all()
    return [version for document in documents if (version := document.current_version) is not None]


def download(
    session: Session,
    storage: FileStorage,
    tournament_id: int,
    purpose: PolicyPurpose | None,
    document_id: int,
    user: User | AnonymousUser,
):
    if purpose is None and isinstance(user, AnonymousUser):
        raise InvalidCredentialsException()
    load_visible_tournament(session, tournament_id, user)
    version = session.scalar(
        select(TournamentDocumentVersion)
        .join(TournamentDocument)
        .where(
            TournamentDocument.tournament_id == tournament_id,
            TournamentDocument.purpose == purpose,
            TournamentDocumentVersion.id == document_id,
        )
    )
    if version is None:
        raise RegistrationResourceNotFoundError("Tournament document not found")
    file = version.archive.file
    return {
        "download_url": storage.create_presigned_get_url(file.storage_key, expires_in=URL_EXPIRY),
        "content_type": file.content_type,
        "expires_in_seconds": URL_EXPIRY,
    }
