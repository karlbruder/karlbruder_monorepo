"""Portuguese notices for committed payment-review outcomes."""

import logging
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode
from uuid import UUID

from app.auth.account_email import AccountEmailReader, AccountEmailReadError
from app.core.mail import MailSender, MailDeliveryError, MailUnavailableError
from app.tournaments.templates.email_notifications import render_tournament_email

logger = logging.getLogger(__name__)
DeliveryResult = Literal["sent", "lookup_failed", "unavailable", "send_failed"]


@dataclass(frozen=True)
class PaymentReviewNotice:
    review_id: int
    user_id: UUID
    tournament_id: int
    registration_number: str
    outcome: Literal["confirmed", "waitlist", "rejected"]
    rejection_reason: str | None = None


def send_payment_review_notice(
    notice: PaymentReviewNotice,
    *,
    accounts: AccountEmailReader,
    sender: MailSender,
    application_base_url: str | None,
    from_address: str,
) -> DeliveryResult:
    """Attempt once after commit. Log identifiers and result, never delivery content."""
    result: DeliveryResult = "unavailable"
    if application_base_url is not None:
        try:
            query = urlencode(
                {
                    "tournament_id": notice.tournament_id,
                    "registration_number": notice.registration_number,
                }
            )
            link = f"{application_base_url.rstrip('/')}/tournaments/registration?{query}"
            if notice.outcome == "rejected" and (
                not notice.rejection_reason or not notice.rejection_reason.strip()
            ):
                raise ValueError("Rejected evidence requires a reason")
            subject, body = render_tournament_email(
                notice.outcome, registration_number=notice.registration_number,
                link=link, rejection_reason=notice.rejection_reason,
            )
            recipient = accounts.read_email(notice.user_id)
            sender.send(
                from_address=from_address, recipient=recipient, subject=subject, body=body
            )
            result = "sent"
        except AccountEmailReadError:
            result = "lookup_failed"
        except MailUnavailableError:
            result = "unavailable"
        except MailDeliveryError:
            result = "send_failed"
    logger.info(
        "payment_review_notification",
        extra={
            "review_id": notice.review_id,
            "notification_type": notice.outcome,
            "delivery_result": result,
        },
    )
    return result
