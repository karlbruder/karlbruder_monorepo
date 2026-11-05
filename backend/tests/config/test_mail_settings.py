"""Enabled mail must have coherent configuration before network use."""

import pytest
from pydantic import ValidationError

from config.test import TestSettings as Settings


@pytest.mark.parametrize(
    "name", ["SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "APP_BASE_URL"]
)
def test_enabled_mail_rejects_missing_required_configuration(name):
    with pytest.raises(ValidationError):
        values = dict(
            SMTP_ENABLED=True,
            SMTP_HOST="smtp.example.test",
            SMTP_USERNAME="fixture",
            SMTP_PASSWORD="fixture",
            APP_BASE_URL="https://app.example.test",
        )
        values[name] = None
        Settings(_env_file=None, **values)


@pytest.mark.parametrize(
    "origin",
    [
        "https://user:secret@example.test",
        "https://example.test/path",
        "https://example.test?x=1",
        "https://example.test/#fragment",
    ],
)
def test_application_url_rejects_credentials_paths_and_queries(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, APP_BASE_URL=origin)


def test_enabled_starttls_rejects_the_implicit_tls_port():
    with pytest.raises(ValidationError, match="SMTP uses STARTTLS"):
        Settings(
            _env_file=None,
            SMTP_ENABLED=True,
            SMTP_HOST="smtp.example.test",
            SMTP_USERNAME="fixture",
            SMTP_PASSWORD="fixture",
            SMTP_PORT=465,
            APP_BASE_URL="https://app.example.test",
        )


@pytest.mark.parametrize("sender", ["", "invalid", "a@example.test, b@example.test", "Support <a@example.test>\nBcc: b@example.test"])
def test_sender_setting_rejects_invalid_or_multiple_addresses(sender):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, SMTP_FROM=sender)
