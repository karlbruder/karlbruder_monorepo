"""Capture policy versions before publication and project their authorized copies."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.files import FileStorage
from app.auth.models import User
from app.auth.services import get_application_role
from app.core.files.archiving import archive_file
from app.tournaments.services.tournament_payment_settings import (
    create_tournament_payment_settings,
)
from app.tournaments.exceptions import (
    RegistrationConflictError,
    RegistrationNotAllowedError,
)
from app.tournaments.models import Tournament
from .policy_fetch import PolicyFetcher
from .registration_acceptances import acceptance_content, content_digest
from .registration_documents import delete_storage_object_quietly
from .tournament_slugs import resolve_tournament_slug


if TYPE_CHECKING:
    from app.tournaments.schemas import TournamentCreate, TournamentRead


def prepare_policy_archives(
    tournament: Tournament,
    storage: FileStorage,
    fetcher: PolicyFetcher,
    created_keys: list[str],
) -> None:
    """Capture configured URL versions without committing or holding a database lock."""
    for name in ("rules", "cancellation_policy"):
        url = getattr(tournament, f"{name}_url")
        if not url:
            setattr(tournament, f"{name}_archive", None)
            continue
        fetched = fetcher.fetch(url)
        archive = archive_file(
            storage,
            body=fetched.body,
            original_file_name=f"{name}.{'pdf' if fetched.content_type == 'application/pdf' else 'txt'}",
            content_type=fetched.content_type,
            source_url=url,
            final_url=fetched.final_url,
        )
        created_keys.append(archive.file.storage_key)
        setattr(tournament, f"{name}_archive", archive)


def create_tournament_configuration(
    session: Session,
    payload: TournamentCreate,
    actor: User,
    storage: FileStorage,
    fetcher: PolicyFetcher,
) -> TournamentRead:
    if get_application_role(actor) != "admin":
        raise RegistrationNotAllowedError("Guild staff access is required")
    slug = resolve_tournament_slug(
        payload.name, payload.discipline, payload.starts_at, payload.slug
    )
    if session.scalar(select(Tournament.id).where(Tournament.slug == slug)) is not None:
        raise RegistrationConflictError("Tournament slug already exists")
    tournament = Tournament(**{**payload.model_dump(exclude={"pix_key"}), "slug": slug})
    created_keys = []
    try:
        prepare_policy_archives(tournament, storage, fetcher, created_keys)
        session.add(tournament)
        session.flush()
        create_tournament_payment_settings(session, tournament.id, payload.pix_key)
        response = project_tournament(tournament, storage)
        session.commit()
    except Exception as error:
        session.rollback()
        for key in created_keys:
            delete_storage_object_quietly(storage, key)
        if (
            isinstance(error, IntegrityError)
            and getattr(getattr(error.orig, "diag", None), "constraint_name", None)
            == "uq_tournaments_slug"
        ):
            raise RegistrationConflictError("Tournament slug already exists") from error
        raise
    return response


def project_tournament(tournament: Tournament, storage: FileStorage) -> TournamentRead:
    from app.tournaments.schemas import TournamentRead

    values = {
        name: getattr(tournament, name)
        for name in TournamentRead.model_fields
        if name
        not in {
            "acceptance_content",
            "acceptance_tokens",
            "rules_archive_url",
            "cancellation_policy_archive_url",
        }
    }
    contents = {
        language: acceptance_content(tournament, language) for language in ("pt", "en")
    }
    values.update(
        acceptance_content=contents,
        acceptance_tokens={
            language: content_digest(content) for language, content in contents.items()
        },
    )
    for name in ("rules", "cancellation_policy"):
        archive = getattr(tournament, f"{name}_archive")
        values[f"{name}_archive_url"] = (
            storage.create_presigned_get_url(
                archive.file.storage_key,
                expires_in=900,
                download_name=archive.file.original_file_name,
            )
            if archive
            else None
        )
    return TournamentRead(**values)
