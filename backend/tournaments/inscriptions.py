"""Human-readable registration references, never authorization credentials."""

import re

MAX_SERIAL = 999_999
_PATTERN = re.compile(r"^T([1-9][0-9]*)-([0-9]{6})-([0-9])$")


def _check_digit(digits: str) -> int:
    """Return the Luhn digit for a sequence of decimal digits."""

    total = 0
    for position, character in enumerate(reversed(digits), start=1):
        value = int(character)
        if position % 2 == 1:
            value *= 2
            if value > 9:
                value -= 9
        total += value
    return (-total) % 10


def format_inscription_number(tournament_id: int, serial: int) -> str:
    """Format a non-reusable tournament-local serial with a check digit."""

    if tournament_id < 1 or not 1 <= serial <= MAX_SERIAL:
        raise ValueError("Tournament ID and serial must be positive; serial is six digits")
    digits = f"{tournament_id}{serial:06d}"
    return f"T{tournament_id}-{serial:06d}-{_check_digit(digits)}"


def is_valid_inscription_number(value: str) -> bool:
    match = _PATTERN.fullmatch(value)
    if match is None:
        return False
    tournament_id, serial, check = match.groups()
    if int(serial) < 1:
        return False
    return _check_digit(tournament_id + serial) == int(check)
