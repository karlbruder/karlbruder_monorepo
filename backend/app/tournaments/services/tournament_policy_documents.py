"""Publish and retrieve tournament-owned policy archive versions."""

from typing import Literal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import AnonymousUser, User
from app.auth.supabase.roles import get_application_role
from app.core.files import FileStorage
from app.core.files.models import ArchivedFile
from app.core.files.archiving import archive_file
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
from app.tournaments.services.registration_uploads import MAX_REGISTRATION_DOCUMENT_BYTES, validate_stored_object_size_and_type
from app.tournaments.services.tournament_catalog import load_visible_tournament

PolicyPurpose = Literal["rules", "cancellation_policy"]
URL_EXPIRY = 900


def _require_admin(user: User) -> None:
    if get_application_role(user) != "admin":
        raise AdminAccessRequiredException()


def _prefix(tournament_id: int, purpose: PolicyPurpose, user: User) -> str:
    return f"tournaments/{tournament_id}/staging/{user.id}/policy/{purpose}/"


def create_upload(session: Session, storage: FileStorage, tournament_id: int, purpose: PolicyPurpose, user: User):
    _require_admin(user)
    load_visible_tournament(session, tournament_id, user)
    key = _prefix(tournament_id, purpose, user) + str(uuid4())
    content_type = "application/octet-stream"
    return {"storage_key": key, "upload_url": storage.create_presigned_put_url(key, content_type=content_type, expires_in=URL_EXPIRY), "expires_in_seconds": URL_EXPIRY, "required_headers": {"Content-Type": content_type}}


def publish(session: Session, storage: FileStorage, tournament_id: int, purpose: PolicyPurpose, user: User, key: str, filename: str) -> TournamentDocumentVersion:
    _require_admin(user)
    load_visible_tournament(session, tournament_id, user, lock=True)
    prefix = _prefix(tournament_id, purpose, user)
    if not key.startswith(prefix) or "/" in key[len(prefix):] or not key[len(prefix):]:
        raise RegistrationDocumentInvalidError("Invalid policy storage key")
    archive_key = None
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
                title="Rules" if purpose == "rules" else "Cancellation policy",
            )
            session.add(document)
        version = TournamentDocumentVersion(document=document, archive=archive)
        session.add(version)
        session.flush()
        session.commit()
    except UploadEmptyError as error:
        session.rollback()
        raise RegistrationDocumentInvalidError("Policy file is empty") from error
    except UploadTooLargeError as error:
        session.rollback()
        raise RegistrationDocumentTooLargeError("Policy file is too large") from error
    except UploadDisallowedTypeError as error:
        session.rollback()
        raise RegistrationDocumentTypeNotAllowedError("Policy file type is not allowed") from error
    except Exception:
        session.rollback()
        if archive_key:
            delete_storage_object_quietly(storage, archive_key)
        raise
    finally:
        delete_storage_object_quietly(storage, key)
    return version


def current_documents(session: Session, tournament_id: int, user: User | AnonymousUser):
    load_visible_tournament(session, tournament_id, user)
    documents = session.scalars(
        select(TournamentDocument)
        .where(TournamentDocument.tournament_id == tournament_id, TournamentDocument.purpose.is_not(None))
        .options(selectinload(TournamentDocument.versions).joinedload(TournamentDocumentVersion.archive).joinedload(ArchivedFile.file))
        .execution_options(populate_existing=True)
    ).all()
    return {document.purpose: document.current_version for document in documents if document.current_version is not None}



def download(session: Session, storage: FileStorage, tournament_id: int, purpose: PolicyPurpose, document_id: int, user: User | AnonymousUser):
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
        raise RegistrationResourceNotFoundError("Policy document not found")
    file = version.archive.file
    return {"download_url": storage.create_presigned_get_url(file.storage_key, expires_in=URL_EXPIRY), "content_type": file.content_type, "expires_in_seconds": URL_EXPIRY}
