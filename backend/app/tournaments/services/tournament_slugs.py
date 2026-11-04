"""URL-safe slugs for tournament catalog entries."""

import re
import unicodedata
from datetime import datetime

from app.tournaments.services.tournament_local_dates import TOURNAMENT_LOCAL_TIMEZONE

TOURNAMENT_SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
_SLUG_MAX_LENGTH = 100


def resolve_tournament_slug(
    name: str,
    discipline: str | None,
    starts_at: datetime,
    requested_slug: str | None,
) -> str:
    """Return the admin-provided slug or derive one from name, discipline, and event year."""

    if requested_slug:
        return requested_slug
    return build_tournament_slug(name, discipline, starts_at)


def build_tournament_slug(
    name: str, discipline: str | None, starts_at: datetime
) -> str:
    """Build a URL-safe slug from the display name, optional discipline, and event year."""

    parts = [_normalize_text_to_kebab_case(name)]
    if discipline and discipline.strip():
        parts.append(_normalize_text_to_kebab_case(discipline))
    parts.append(str(starts_at.astimezone(TOURNAMENT_LOCAL_TIMEZONE).year))
    slug = "-".join(part for part in parts if part)
    if not re.fullmatch(TOURNAMENT_SLUG_PATTERN, slug) or len(slug) > _SLUG_MAX_LENGTH:
        raise ValueError("Tournament slug could not be derived from the event")
    return slug


def _normalize_text_to_kebab_case(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    )
    return "-".join(re.findall(r"[a-z0-9]+", ascii_value.lower()))
