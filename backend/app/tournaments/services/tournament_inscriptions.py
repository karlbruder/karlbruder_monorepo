"""Human-readable tournament inscription numbers with a check digit.

These values identify a tournament registration for people and staff. They are not
authorization credentials.
"""

import re

MAX_TOURNAMENT_INSCRIPTION_SERIAL = 999_999
_INSCRIPTION_NUMBER_PATTERN = re.compile(r"^T([1-9][0-9]*)-([0-9]{6})-([0-9])$")


def format_tournament_inscription_number(tournament_id: int, serial: int) -> str:
    """Format a tournament-local serial with a Luhn check digit."""

    if tournament_id < 1 or not 1 <= serial <= MAX_TOURNAMENT_INSCRIPTION_SERIAL:
        raise ValueError("Tournament ID and serial must be positive; serial is six digits")
    digits = f"{tournament_id}{serial:06d}"
    return f"T{tournament_id}-{serial:06d}-{_inscription_check_digit(digits)}"


def is_valid_tournament_inscription_number(value: str) -> bool:
    """Return whether ``value`` matches the inscription format and check digit."""

    match = _INSCRIPTION_NUMBER_PATTERN.fullmatch(value)
    if match is None:
        return False
    tournament_id, serial, check = match.groups()
    if int(serial) < 1:
        return False
    return _inscription_check_digit(tournament_id + serial) == int(check)


def _inscription_check_digit(digits: str) -> int:
    total = 0
    for position, character in enumerate(reversed(digits), start=1):
        value = int(character)
        if position % 2 == 1:
            value *= 2
            if value > 9:
                value -= 9
        total += value
    return (-total) % 10
