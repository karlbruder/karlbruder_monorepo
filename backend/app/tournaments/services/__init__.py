"""Business logic for the tournaments domain.

Import from this package so callers stay stable while modules split by topic.
"""

from app.tournaments.services.tournament_inscriptions import (
    MAX_TOURNAMENT_INSCRIPTION_SERIAL,
    format_tournament_inscription_number,
    is_valid_tournament_inscription_number,
)
from app.tournaments.services.tournament_local_dates import (
    TOURNAMENT_LOCAL_TIMEZONE,
    current_local_calendar_date,
    eighteenth_birthday,
    is_minor_at_tournament_start,
    local_calendar_date,
)
from app.tournaments.services.tournament_signup_payment import (
    read_tournament_signup_payment_instructions,
)
from app.tournaments.services.tournament_signups import (
    create_tournament_signup,
    is_duplicate_tournament_signup,
    normalize_tournament_registration_identity,
    read_tournament_signup_parental_term_download,
    visible_tournament,
)
from app.tournaments.services.tournament_slugs import (
    TOURNAMENT_SLUG_PATTERN,
    build_tournament_slug,
    resolve_tournament_slug,
)

__all__ = [
    "MAX_TOURNAMENT_INSCRIPTION_SERIAL",
    "TOURNAMENT_LOCAL_TIMEZONE",
    "TOURNAMENT_SLUG_PATTERN",
    "build_tournament_slug",
    "create_tournament_signup",
    "current_local_calendar_date",
    "eighteenth_birthday",
    "format_tournament_inscription_number",
    "is_duplicate_tournament_signup",
    "is_minor_at_tournament_start",
    "is_valid_tournament_inscription_number",
    "local_calendar_date",
    "normalize_tournament_registration_identity",
    "read_tournament_signup_parental_term_download",
    "read_tournament_signup_payment_instructions",
    "resolve_tournament_slug",
    "visible_tournament",
]
