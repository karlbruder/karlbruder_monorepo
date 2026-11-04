"""Human-readable tournament registration numbers with a check digit.

These values identify a tournament registration for people and staff. They are not
authorization credentials.
"""

import re

MAX_TOURNAMENT_REGISTRATION_NUMBER = 999_999
_REGISTRATION_NUMBER_PATTERN = re.compile(r"^T([1-9][0-9]*)-([0-9]{6})-([0-9])$")


def format_tournament_registration_number(tournament_id: int, serial: int) -> str:
    """Format a tournament-local serial with a Luhn check digit."""

    if tournament_id < 1 or not 1 <= serial <= MAX_TOURNAMENT_REGISTRATION_NUMBER:
        raise ValueError(
            "Tournament ID and serial must be positive; serial is six digits"
        )
    digits = f"{tournament_id}{serial:06d}"
    return f"T{tournament_id}-{serial:06d}-{_registration_check_digit(digits)}"


def is_valid_tournament_registration_number(value: str) -> bool:
    """Return whether ``value`` matches the registration format and check digit."""

    match = _REGISTRATION_NUMBER_PATTERN.fullmatch(value)
    if match is None:
        return False
    tournament_id, serial, check = match.groups()
    if int(serial) < 1:
        return False
    return _registration_check_digit(tournament_id + serial) == int(check)


def _registration_check_digit(digits: str) -> int:
    total = 0
    for position, character in enumerate(reversed(digits), start=1):
        value = int(character)
        if position % 2 == 1:
            value *= 2
            if value > 9:
                value -= 9
        total += value
    return (-total) % 10
