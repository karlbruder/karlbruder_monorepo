"""Portuguese notices for committed payment-review outcomes."""

import logging
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode
from uuid import UUID

from app.auth.account_email import AccountEmailReader, AccountEmailReadError
from app.core.mail import MailSender, MailDeliveryError, MailUnavailableError

logger = logging.getLogger(__name__)
DeliveryResult = Literal["sent", "lookup_failed", "unavailable", "send_failed"]


@dataclass(frozen=True)
class PaymentReviewNotice:
    review_id: int
    user_id: UUID
    tournament_id: int
    registration_number: str
    outcome: Literal["waitlist", "rejected"]
    rejection_reason: str | None = None


def send_payment_review_notice(
    notice: PaymentReviewNotice,
    *,
    accounts: AccountEmailReader,
    sender: MailSender,
    application_base_url: str,
    from_address: str,
) -> DeliveryResult:
    """Attempt once after commit. Log identifiers and result, never delivery content."""
    query = urlencode(
        {
            "tournament_id": notice.tournament_id,
            "registration_number": notice.registration_number,
        }
    )
    link = f"{application_base_url.rstrip('/')}/tournaments/registration?{query}"
    if notice.outcome == "waitlist":
        subject = f"Inscrição {notice.registration_number}: lista de espera"
        body = (
            f"Inscrição {notice.registration_number}\n\n"
            "Seu pagamento foi aprovado. Sua inscrição está na lista de espera. "
            "Você não tem uma vaga confirmada. Não é necessário pagar novamente.\n\n"
            f"Consulte sua inscrição no aplicativo: {link}\n"
        )
    else:
        if not notice.rejection_reason or not notice.rejection_reason.strip():
            raise ValueError("Rejected evidence requires a reason")
        subject = f"Inscrição {notice.registration_number}: comprovante rejeitado"
        body = (
            f"Inscrição {notice.registration_number}\n\n"
            f"Seu comprovante foi rejeitado. Motivo: {notice.rejection_reason}\n\n"
            "Sua inscrição não foi cancelada e não tem uma vaga confirmada. "
            "Entre no aplicativo para enviar um novo comprovante: "
            f"{link}\n"
        )
    try:
        recipient = accounts.read_email(notice.user_id)
        sender.send(from_address=from_address, recipient=recipient, subject=subject, body=body)
        result: DeliveryResult = "sent"
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
