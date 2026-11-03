"""Minor-age rule for tournament registration on the event date."""

from datetime import date, datetime

from app.tournaments.event_dates import event_date_from_starts_at


def eighteenth_birthday(birth_date: date) -> date:
    """Date the person turns 18, including 29 February birth dates."""

    target_year = birth_date.year + 18
    try:
        return birth_date.replace(year=target_year)
    except ValueError:
        return date(target_year, 3, 1)


def is_minor_on_event_date(birth_date: date, event_starts_at: datetime) -> bool:
    """True when the event day in UTC-03:00 falls before the 18th birthday."""

    event_day = event_date_from_starts_at(event_starts_at)
    return event_day < eighteenth_birthday(birth_date)
