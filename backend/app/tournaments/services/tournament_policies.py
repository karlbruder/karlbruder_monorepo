"""Capture policy versions before publication."""

from app.core.files import FileStorage
from app.core.files.archiving import archive_file
from app.tournaments.models import Tournament
from .policy_fetch import PolicyFetcher

def prepare_tournament_policy_archives(
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
