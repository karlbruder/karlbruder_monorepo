"""Tournament catalog helpers. Slugs are derived from the display name, modality, and event year."""

import re
import unicodedata
from datetime import datetime, timedelta, timezone

TOURNAMENT_SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
EVENT_TIMEZONE = timezone(timedelta(hours=-3))
_SLUG_MAX_LENGTH = 100


def build_tournament_slug(name: str, modality: str | None, starts_at: datetime) -> str:
    parts = [_normalize_text_to_kebab_case(name)]
    if modality and modality.strip():
        parts.append(_normalize_text_to_kebab_case(modality))
    parts.append(str(starts_at.astimezone(EVENT_TIMEZONE).year))
    slug = "-".join(part for part in parts if part)
    if not re.fullmatch(TOURNAMENT_SLUG_PATTERN, slug) or len(slug) > _SLUG_MAX_LENGTH:
        raise ValueError("Tournament slug could not be derived from the event")
    return slug


def resolve_tournament_slug(
    name: str,
    modality: str | None,
    starts_at: datetime,
    requested_slug: str | None,
) -> str:
    if requested_slug:
        return requested_slug
    return build_tournament_slug(name, modality, starts_at)


def _normalize_text_to_kebab_case(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return "-".join(re.findall(r"[a-z0-9]+", ascii_value.lower()))
