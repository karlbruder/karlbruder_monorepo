"""Bounded authenticated STARTTLS delivery of plain-text application mail."""

import smtplib
import ssl
from dataclasses import dataclass, field
from email.errors import HeaderParseError
from email.headerregistry import Address, HeaderRegistry
from email.message import EmailMessage
from typing import Protocol


class MailDeliveryError(Exception):
    """A mail delivery attempt failed with sanitized diagnostic details."""

    def __init__(self, message: str, *, stage: str = "unknown", smtp_code: int | None = None):
        super().__init__(message)
        self.stage = stage
        self.smtp_code = smtp_code


class MailUnavailableError(MailDeliveryError):
    """Application mail is disabled or unavailable."""


def validate_email_address(value: str) -> str:
    try:
        address = Address(addr_spec=value)
    except (ValueError, HeaderParseError) as error:
        raise ValueError("Invalid email address") from error
    if not address.username or not address.domain or any(c.isspace() for c in value):
        raise ValueError("Invalid email address")
    return value


def validate_sender_address(value: str) -> str:
    if not value.strip() or "\r" in value or "\n" in value:
        raise ValueError("Invalid sender address")
    header = HeaderRegistry()("From", value)
    if header.defects or len(header.addresses) != 1:
        raise ValueError("Invalid sender address")
    validate_email_address(header.addresses[0].addr_spec)
    return value


class MailSender(Protocol):
    def send(self, *, from_address: str, recipient: str, subject: str, body: str) -> None: ...


@dataclass(frozen=True)
class SmtpMailSender:
    enabled: bool
    host: str | None
    port: int
    username: str | None
    password: str | None = field(repr=False)
    timeout: float

    def send(self, *, from_address: str, recipient: str, subject: str, body: str) -> None:
        if not self.enabled:
            raise MailUnavailableError("Application mail is disabled")
        stage = "validate"
        try:
            validate_email_address(recipient)
            message = EmailMessage()
            message["From"] = validate_sender_address(from_address)
            message["To"] = recipient
            message["Subject"] = subject
            message.set_content(body)
            stage = "connect"
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as smtp:
                stage = "starttls"
                smtp.starttls(context=ssl.create_default_context())
                stage = "authenticate"
                smtp.login(self.username, self.password)
                stage = "send"
                refused = smtp.send_message(message)
                if refused:
                    raise smtplib.SMTPRecipientsRefused(refused)
        except (smtplib.SMTPException, OSError, ValueError) as error:
            code = error.smtp_code if isinstance(error, smtplib.SMTPResponseException) else None
            raise MailDeliveryError(
                "Application mail delivery failed", stage=stage, smtp_code=code
            ) from error
