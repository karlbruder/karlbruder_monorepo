"""Calendar dates for tournament rules in fixed UTC-03:00, it assumes that the tournament is in America/Sao_Paulo timezone.

Registration windows, minor-age checks, and refund deadlines use this local calendar.
"""

from datetime import date, datetime, timedelta, timezone

TOURNAMENT_LOCAL_TIMEZONE = timezone(timedelta(hours=-3))


def local_calendar_date(aware_instant: datetime) -> date:
    """Map one aware instant to its date in ``TOURNAMENT_LOCAL_TIMEZONE``."""

    if aware_instant.tzinfo is None:
        raise ValueError("aware_instant must be timezone-aware")
    return aware_instant.astimezone(TOURNAMENT_LOCAL_TIMEZONE).date()


def current_local_calendar_date(now: datetime | None = None) -> date:
    """Return the local date used to evaluate registration windows."""

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


def refund_due_date(cancelled_at: datetime) -> date:
    """Return the tenth weekday after cancellation, ignoring holidays."""
    due_on = local_calendar_date(cancelled_at)
    weekdays = 0
    while weekdays < 10:
        due_on += timedelta(days=1)
        if due_on.weekday() < 5:
            weekdays += 1
    return due_on
