import pytest

from tournaments.inscriptions import format_inscription_number, is_valid_inscription_number


def test_format_has_tournament_serial_and_luhn_digit():
    assert format_inscription_number(42, 1) == "T42-000001-0"
    assert is_valid_inscription_number("T42-000001-0")
    assert format_inscription_number(1, 999_999).startswith("T1-999999-")


def test_check_digit_detects_common_transcription_error():
    original = format_inscription_number(42, 123)
    assert is_valid_inscription_number(original)
    assert not is_valid_inscription_number(original.replace("000123", "000124"))
    assert not is_valid_inscription_number(original[:-1] + str((int(original[-1]) + 1) % 10))


@pytest.mark.parametrize("tournament_id,serial", [(0, 1), (1, 0), (1, 1_000_000)])
def test_format_rejects_values_outside_supported_range(tournament_id, serial):
    with pytest.raises(ValueError):
        format_inscription_number(tournament_id, serial)


@pytest.mark.parametrize("value", ["T0-000001-0", "T42-000000-0", "42-000001-0", "T42-1-0"])
def test_validation_rejects_noncanonical_numbers(value):
    assert not is_valid_inscription_number(value)
