"""UTC-03:00 calendar dates for registration windows and minor-age rules."""

from datetime import UTC, date, datetime

import pytest

from app.tournaments.services.tournament_local_dates import (
    current_local_calendar_date,
    eighteenth_birthday,
    is_minor_at_tournament_start,
    local_calendar_date,
)


def test_eighteenth_birthday_for_leap_day_birth_date():
    assert eighteenth_birthday(date(2008, 2, 29)) == date(2026, 3, 1)


@pytest.mark.parametrize(
    ("birth_date", "event_starts_at", "expected_minor"),
    [
        (date(2009, 1, 17), datetime(2027, 1, 17, 12, 0, tzinfo=UTC), False),
        (date(2009, 1, 17), datetime(2027, 1, 16, 12, 0, tzinfo=UTC), True),
        (date(2009, 1, 17), datetime(2027, 1, 18, 12, 0, tzinfo=UTC), False),
    ],
)
def test_is_minor_at_tournament_start_around_eighteenth_birthday(
    birth_date, event_starts_at, expected_minor
):
    assert is_minor_at_tournament_start(birth_date, event_starts_at) is expected_minor


def test_local_calendar_date_uses_fixed_utc_minus_three_at_midnight():
    assert current_local_calendar_date(datetime(2026, 10, 1, 2, 59, tzinfo=UTC)) == date(2026, 9, 30)
    assert current_local_calendar_date(datetime(2026, 10, 1, 3, 0, tzinfo=UTC)) == date(2026, 10, 1)
    assert current_local_calendar_date(datetime(2026, 11, 1, 2, 59, tzinfo=UTC)) == date(2026, 10, 31)
    assert current_local_calendar_date(datetime(2026, 11, 1, 3, 0, tzinfo=UTC)) == date(2026, 11, 1)


def test_local_calendar_date_maps_tournament_start_instant_to_local_day():
    """A UTC instant after midnight UTC-3 still counts as the previous local day."""

    starts_at = datetime(2027, 1, 17, 2, 59, tzinfo=UTC)
    assert local_calendar_date(starts_at) == date(2027, 1, 16)
    assert is_minor_at_tournament_start(date(2009, 1, 17), starts_at) is True
