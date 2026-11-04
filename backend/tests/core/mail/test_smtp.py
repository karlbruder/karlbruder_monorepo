"""COM-007/008: authenticated TLS delivery with bounded calls and safe failures."""

import smtplib
from unittest.mock import patch

import pytest

from app.core.mail import SmtpMailSender, MailDeliveryError, MailUnavailableError


def _sender(enabled=True):
    return SmtpMailSender(
        enabled, "smtp.example.test", 587, "fixture-user", "fixture-password", 3
    )


def test_sender_uses_starttls_auth_timeout_and_plain_text_without_attachments():
    with patch("app.core.mail.smtplib.SMTP") as transport:
        smtp = transport.return_value.__enter__.return_value
        smtp.send_message.return_value = {}
        _sender().send(from_address="Suporte Karlbrüder <no-reply@karlbruder.com.br>", 
            recipient="current@example.test",
            subject="Inscrição T1",
            body="Lista de espera",
        )
        transport.assert_called_once_with("smtp.example.test", 587, timeout=3)
        smtp.starttls.assert_called_once()
        smtp.login.assert_called_once_with("fixture-user", "fixture-password")
        assert [call[0] for call in smtp.method_calls] == [
            "starttls",
            "login",
            "send_message",
        ]
        message = smtp.send_message.call_args.args[0]
        assert str(message["From"]) == "Suporte Karlbrüder <no-reply@karlbruder.com.br>"
        assert message["To"] == "current@example.test"
        assert message.get_content_type() == "text/plain"
        assert list(message.iter_attachments()) == []
        assert "Lista de espera" in message.get_content()


@pytest.mark.parametrize(
    "failure",
    [
        TimeoutError(),
        smtplib.SMTPAuthenticationError(535, b"secret"),
        smtplib.SMTPException("private"),
    ],
)
def test_transport_failures_become_sanitized_delivery_errors(failure):
    with patch("app.core.mail.smtplib.SMTP", side_effect=failure):
        with pytest.raises(MailDeliveryError, match="Application mail delivery failed"):
            _sender().send(from_address="Suporte Karlbrüder <no-reply@karlbruder.com.br>", 
                recipient="current@example.test", subject="Subject", body="Body"
            )


def test_disabled_delivery_does_not_open_transport():
    with patch("app.core.mail.smtplib.SMTP") as transport:
        with pytest.raises(MailUnavailableError):
            _sender(False).send(from_address="Suporte Karlbrüder <no-reply@karlbruder.com.br>", 
                recipient="current@example.test", subject="Subject", body="Body"
            )
        transport.assert_not_called()


@pytest.mark.parametrize(
    "recipient",
    ["missing", "bad\nBcc: hidden@example.test", "Name <person@example.test>"],
)
def test_invalid_recipient_never_opens_transport(recipient):
    with patch("app.core.mail.smtplib.SMTP") as transport:
        with pytest.raises(MailDeliveryError):
            _sender().send(from_address="Suporte Karlbrüder <no-reply@karlbruder.com.br>", recipient=recipient, subject="Subject", body="Body")
        transport.assert_not_called()


def test_refused_recipient_is_a_failed_delivery():
    with patch("app.core.mail.smtplib.SMTP") as transport:
        transport.return_value.__enter__.return_value.send_message.return_value = {
            "current@example.test": (550, b"refused")
        }
        with pytest.raises(MailDeliveryError):
            _sender().send(from_address="Suporte Karlbrüder <no-reply@karlbruder.com.br>", 
                recipient="current@example.test", subject="Subject", body="Body"
            )


@pytest.mark.parametrize("stage", ["starttls", "login", "send_message"])
def test_smtp_stage_failures_are_isolated_and_connection_is_closed(stage):
    with patch("app.core.mail.smtplib.SMTP") as transport:
        smtp = transport.return_value.__enter__.return_value
        getattr(smtp, stage).side_effect = smtplib.SMTPException("private transport detail")
        with pytest.raises(MailDeliveryError):
            _sender().send(from_address="Suporte Karlbrüder <no-reply@karlbruder.com.br>", recipient="current@example.test", subject="Subject", body="Body")
        transport.return_value.__exit__.assert_called_once()
        if stage == "starttls":
            smtp.login.assert_not_called()
        if stage != "send_message":
            smtp.send_message.assert_not_called()


def test_sender_uses_the_explicit_from_address():
    with patch("app.core.mail.smtplib.SMTP") as transport:
        smtp = transport.return_value.__enter__.return_value
        smtp.send_message.return_value = {}
        _sender().send(from_address="Event Support <event@example.test>", recipient="current@example.test", subject="Subject", body="Body")
        assert str(smtp.send_message.call_args.args[0]["From"]) == "Event Support <event@example.test>"
