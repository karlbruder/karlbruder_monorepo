"""Business logic for the tournaments domain.

Import from this package so callers stay stable while modules split by topic.
"""

from app.tournaments.services.registration_numbers import (
    MAX_TOURNAMENT_REGISTRATION_NUMBER,
    format_tournament_registration_number,
    is_valid_tournament_registration_number,
)
from app.tournaments.services.tournament_local_dates import (
    TOURNAMENT_LOCAL_TIMEZONE,
    current_local_calendar_date,
    eighteenth_birthday,
    is_minor_at_tournament_start,
    local_calendar_date,
)
from app.tournaments.services.registration_payment_instructions import (
    create_registration_payment_proof_upload_url,
    read_registration_payment_instructions,
    read_registration_payment_proof_download,
    submit_registration_payment_proof,
)
from app.tournaments.services.tournament_registrations import (
    create_tournament_registration,
    is_duplicate_tournament_registration,
    normalize_tournament_registration_identity,
    read_tournament_registration_parental_consent_form_download,
    visible_tournament,
)
from app.tournaments.services.tournament_slugs import (
    TOURNAMENT_SLUG_PATTERN,
    build_tournament_slug,
    resolve_tournament_slug,
)

__all__ = [
    "MAX_TOURNAMENT_REGISTRATION_NUMBER",
    "TOURNAMENT_LOCAL_TIMEZONE",
    "TOURNAMENT_SLUG_PATTERN",
    "build_tournament_slug",
    "create_tournament_registration",
    "create_registration_payment_proof_upload_url",
    "current_local_calendar_date",
    "eighteenth_birthday",
    "format_tournament_registration_number",
    "is_duplicate_tournament_registration",
    "is_minor_at_tournament_start",
    "is_valid_tournament_registration_number",
    "local_calendar_date",
    "normalize_tournament_registration_identity",
    "read_tournament_registration_parental_consent_form_download",
    "read_registration_payment_instructions",
    "read_registration_payment_proof_download",
    "resolve_tournament_slug",
    "submit_registration_payment_proof",
    "visible_tournament",
]
