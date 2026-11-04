"""COM-008: read the current account address by UUID with no Auth writes."""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.exc import OperationalError

from app.auth.account_email import SupabaseAccountEmailReader, AccountEmailReadError


def test_lookup_reads_current_email_each_time_with_parameterized_uuid():
    engine = MagicMock()
    connection = engine.connect.return_value.__enter__.return_value
    connection.execute.return_value.scalar_one_or_none.side_effect = [
        "old@example.test",
        "new@example.test",
    ]
    lookup = SupabaseAccountEmailReader(engine)
    user_id = uuid4()
    assert lookup.read_email(user_id) == "old@example.test"
    assert lookup.read_email(user_id) == "new@example.test"
    statement, parameters = connection.execute.call_args.args
    assert str(statement) == "SELECT email FROM auth.users WHERE id = :user_id"
    assert parameters == {"user_id": user_id}
    assert engine.connect.call_count == 2


@pytest.mark.parametrize("email", [None, "", "invalid", "bad\n@example.test"])
def test_missing_or_invalid_account_email_is_lookup_failure(email):
    engine = MagicMock()
    engine.connect.return_value.__enter__.return_value.execute.return_value.scalar_one_or_none.return_value = (
        email
    )
    with pytest.raises(AccountEmailReadError):
        SupabaseAccountEmailReader(engine).read_email(uuid4())


def test_lookup_timeout_is_a_typed_failure():
    engine = MagicMock()
    engine.connect.side_effect = OperationalError("private", {}, Exception("timeout"))
    with pytest.raises(
        AccountEmailReadError, match="Current account email unavailable"
    ):
        SupabaseAccountEmailReader(engine).read_email(uuid4())
