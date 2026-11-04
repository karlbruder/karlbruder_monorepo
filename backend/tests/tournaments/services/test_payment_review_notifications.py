"""COM-001/004/008/009: Portuguese outcome notices and isolated failures."""

import logging
from unittest.mock import Mock
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest

from app.auth.account_email import AccountEmailReadError
from app.core.mail import MailDeliveryError, MailUnavailableError
from app.tournaments.services.payment_review_notifications import PaymentReviewNotice, send_payment_review_notice


@pytest.mark.parametrize("outcome", ["waitlist", "rejected"])
def test_notice_uses_current_account_and_outcome_with_authorized_resubmission_link(outcome, caplog):
    notice = PaymentReviewNotice(42, uuid4(), 7, "T7 & special", outcome, "Arquivo ilegível")
    accounts, sender = Mock(), Mock()
    accounts.read_email.return_value = "changed@example.test"
    with caplog.at_level(logging.INFO):
        result = send_payment_review_notice(notice, accounts=accounts, sender=sender, from_address="Event Support <event@example.test>", application_base_url="https://app.example.test/")
    assert result == "sent"
    accounts.read_email.assert_called_once_with(notice.user_id)
    values = sender.send.call_args.kwargs
    assert values["from_address"] == "Event Support <event@example.test>"
    assert values["recipient"] == "changed@example.test"
    assert notice.registration_number in values["subject"]
    assert notice.registration_number in values["body"]
    assert "não tem uma vaga confirmada" in values["body"]
    if outcome == "waitlist":
        assert "pagamento foi aprovado" in values["body"]
        assert "Não é necessário pagar novamente" in values["body"]
    else:
        assert "Arquivo ilegível" in values["body"]
        assert "enviar um novo comprovante" in values["body"]
    link = values["body"].split("https://", 1)[1].strip()
    parsed = urlsplit("https://" + link)
    assert parsed.path == "/tournaments/registration"
    assert parse_qs(parsed.query) == {"tournament_id": ["7"], "registration_number": [notice.registration_number]}
    assert "changed@example.test" not in caplog.text
    assert "Arquivo ilegível" not in caplog.text
    assert caplog.records[-1].review_id == 42
    assert caplog.records[-1].delivery_result == "sent"


@pytest.mark.parametrize("failure,result", [(AccountEmailReadError("private"), "lookup_failed"), (MailUnavailableError("private"), "unavailable"), (MailDeliveryError("private"), "send_failed")])
def test_delivery_failure_returns_result_without_retries_or_private_logs(failure, result, caplog):
    accounts, sender = Mock(), Mock()
    if isinstance(failure, AccountEmailReadError):
        accounts.read_email.side_effect = failure
    else:
        accounts.read_email.return_value = "current@example.test"
        sender.send.side_effect = failure
    notice = PaymentReviewNotice(1, uuid4(), 2, "T2", "rejected", "private rejection")
    with caplog.at_level(logging.INFO):
        assert send_payment_review_notice(notice, accounts=accounts, sender=sender, from_address="Event Support <event@example.test>", application_base_url="https://app.example.test") == result
    assert accounts.read_email.call_count == 1
    assert sender.send.call_count == (0 if result == "lookup_failed" else 1)
    assert "private" not in caplog.text
    assert caplog.records[-1].delivery_result == result
