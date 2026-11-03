"""Fixed UTC-03:00 calendar dates for tournament registration and events."""

from datetime import date, datetime, timedelta, timezone

REGISTRATION_TIMEZONE = timezone(timedelta(hours=-3))


def calendar_date_in_registration_timezone(instant: datetime) -> date:
    """Map an aware datetime to its calendar day in fixed UTC-03:00."""

    if instant.tzinfo is None:
        raise ValueError("instant must be timezone-aware")
    return instant.astimezone(REGISTRATION_TIMEZONE).date()


def event_date_from_starts_at(starts_at: datetime) -> date:
    """Calendar day of the tournament start in fixed UTC-03:00."""

    return calendar_date_in_registration_timezone(starts_at)
