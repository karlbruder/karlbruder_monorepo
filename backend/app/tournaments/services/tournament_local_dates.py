"""Calendar dates for tournament rules in fixed UTC-03:00.

Registration windows and minor-age checks use this local calendar, not the server
timezone. Map any aware ``datetime`` with ``local_calendar_date``. Use
``current_local_calendar_date`` when a rule needs today's date for registration.
"""

from datetime import date, datetime, timedelta, timezone

TOURNAMENT_LOCAL_TIMEZONE = timezone(timedelta(hours=-3))


def local_calendar_date(aware_instant: datetime) -> date:
    """Map one aware instant to its date in ``TOURNAMENT_LOCAL_TIMEZONE``."""

    if aware_instant.tzinfo is None:
        raise ValueError("aware_instant must be timezone-aware")
    return aware_instant.astimezone(TOURNAMENT_LOCAL_TIMEZONE).date()


def current_local_calendar_date(now: datetime | None = None) -> date:
    """Return the local date used to evaluate registration open and close windows."""

    instant = now or datetime.now(timezone.utc)
    return local_calendar_date(instant)


def eighteenth_birthday(birth_date: date) -> date:
    """Return the date the person turns 18.

    For a 29 February birth date in a non-leap 18th year, the result is 1 March.
    """

    target_year = birth_date.year + 18
    try:
        return birth_date.replace(year=target_year)
    except ValueError:
        return date(target_year, 3, 1)


def is_minor_at_tournament_start(birth_date: date, tournament_starts_at: datetime) -> bool:
    """Return whether the competitor is under 18 on the tournament's local start day."""

    start_day = local_calendar_date(tournament_starts_at)
    return start_day < eighteenth_birthday(birth_date)
