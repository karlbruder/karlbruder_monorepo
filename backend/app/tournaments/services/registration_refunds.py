"""Cancel participation and record manual refunds for verified tournament payments."""

import logging
from datetime import UTC, datetime
from urllib.parse import urlencode

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.account_email import AccountEmailReader, AccountEmailReadError
from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.auth.supabase.roles import get_application_role
from app.core.mail import MailDeliveryError, MailSender, MailUnavailableError
from app.karlmart.orders.models import OrderItem
from app.karlmart.payments.models import Payment, Refund
from app.karlmart.payments.services.records import add_refund_record
from app.tournaments.exceptions import RegistrationConflictError, RegistrationResourceNotFoundError
from app.tournaments.models import (
    PaymentProofPayment, PaymentProofReview, Tournament, TournamentRegistration,
    TournamentRegistrationDocument,
)
from app.tournaments.schemas import StaffRegistrationRefundQueue, StaffRegistrationRefundRead
from app.tournaments.services.tournament_local_dates import refund_due_date
from app.tournaments.services.tournament_registrations import visible_tournament


logger = logging.getLogger(__name__)


def _lock_registration_for_refund(
    session: Session, tournament_id: int, number: str, user: User
) -> tuple[Tournament, TournamentRegistration]:
    tournament = visible_tournament(session, tournament_id, user, lock=True)
    registration = session.scalar(
        select(TournamentRegistration)
        .where(TournamentRegistration.tournament_id == tournament_id,
               TournamentRegistration.registration_number == number)
        .with_for_update(of=TournamentRegistration)
        .execution_options(populate_existing=True)
    )
    if registration is None or (registration.user_id != user.id and get_application_role(user) != "admin"):
        raise RegistrationResourceNotFoundError("Registration not found")
    return tournament, registration


def _find_registration_payment(session: Session, registration: TournamentRegistration) -> Payment | None:
    return session.scalar(
        select(Payment).join(OrderItem, OrderItem.order_id == Payment.order_id)
        .where(OrderItem.id == registration.order_item_id)
    )


def read_registration_refund(
    session: Session, tournament_id: int, registration_number: str, user: User
) -> Refund | None:
    visible_tournament(session, tournament_id, user)
    registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
    )
    if registration is None or (
        registration.user_id != user.id and get_application_role(user) != "admin"
    ):
        raise RegistrationResourceNotFoundError("Registration not found")
    payment = _find_registration_payment(session, registration)
    if payment is None:
        return None
    return session.scalar(select(Refund).where(Refund.payment_id == payment.id))


def list_pending_registration_refunds(
    session: Session,
    user: User,
    *,
    limit: int,
    offset: int,
    registration_number: str | None,
) -> StaffRegistrationRefundQueue:
    if get_application_role(user) != "admin":
        raise AdminAccessRequiredException()
    pending = (
        select(
            Tournament.id.label("tournament_id"),
            Tournament.name.label("tournament_name"),
            TournamentRegistration.registration_number,
            TournamentRegistration.full_name,
            Refund.refund_status,
            Refund.amount_owed,
            Refund.obligated_at,
            Refund.due_on,
            Refund.completed_at,
        )
        .select_from(Refund)
        .join(Payment, Payment.id == Refund.payment_id)
        .join(OrderItem, OrderItem.order_id == Payment.order_id)
        .join(TournamentRegistration, TournamentRegistration.order_item_id == OrderItem.id)
        .join(Tournament, Tournament.id == TournamentRegistration.tournament_id)
        .where(
            Refund.refund_status == "awaiting_refund",
            TournamentRegistration.registration_status == "cancelled",
        )
    )
    if registration_number:
        pending = pending.where(
            TournamentRegistration.registration_number == registration_number
        )
    total = session.scalar(select(func.count()).select_from(pending.subquery())) or 0
    rows = session.execute(
        pending.order_by(Refund.due_on, Refund.id).limit(limit).offset(offset)
    ).mappings()
    return StaffRegistrationRefundQueue(
        items=[StaffRegistrationRefundRead.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


def cancel_tournament_registration(session: Session, tournament_id: int, number: str, user: User) -> None:
    """Cancel once, recording any verified receipt as a full refund obligation."""
    try:
        tournament, registration = _lock_registration_for_refund(session, tournament_id, number, user)
        if registration.registration_status == "cancelled":
            raise RegistrationConflictError("Registration is already cancelled")
        if not tournament.refunds_allowed and get_application_role(user) != "admin":
            raise RegistrationConflictError("Self-service cancellation is unavailable for this tournament")
        payment = _find_registration_payment(session, registration) if tournament.refunds_allowed else None
        if payment is not None:
            approved_proof = session.scalar(
                select(PaymentProofPayment.id)
                .join(PaymentProofReview, PaymentProofReview.id == PaymentProofPayment.proof_review_id)
                .join(TournamentRegistrationDocument, TournamentRegistrationDocument.id == PaymentProofReview.document_id)
                .where(PaymentProofPayment.payment_id == payment.id,
                       PaymentProofReview.decision == "approved",
                       TournamentRegistrationDocument.registration_id == registration.id,
                       TournamentRegistrationDocument.document_type == "payment_proof")
            )
            if approved_proof is None:
                raise RegistrationConflictError("Payment requires approved registration proof before cancellation")
        registration.registration_status = "cancelled"
        now = datetime.now(UTC)
        if tournament.refunds_allowed:
            registration.refundable_cancelled_at = now
        if payment is not None:
            add_refund_record(session, payment_id=payment.id, amount_owed=payment.amount_received,
                              obligated_at=now, due_on=refund_due_date(now))
        session.commit()
    except (SQLAlchemyError, RegistrationConflictError, RegistrationResourceNotFoundError):
        session.rollback()
        raise


def record_registration_refund_completion(
    session: Session, tournament_id: int, number: str, user: User, completed_at: datetime,
    *, accounts: AccountEmailReader, sender: MailSender, application_base_url: str | None,
    from_address: str,
) -> str:
    """Record a completed transfer once and attempt its notice after commit."""
    if get_application_role(user) != "admin":
        raise AdminAccessRequiredException()
    try:
        _, registration = _lock_registration_for_refund(session, tournament_id, number, user)
        payment = _find_registration_payment(session, registration)
        refund = None if payment is None else session.scalar(
            select(Refund).where(Refund.payment_id == payment.id).with_for_update(of=Refund)
        )
        if registration.registration_status != "cancelled" or refund is None or refund.refund_status != "awaiting_refund":
            raise RegistrationConflictError("Refund is not awaiting completion")
        if completed_at.tzinfo is None or completed_at < refund.obligated_at or completed_at > datetime.now(UTC):
            raise RegistrationConflictError("Refund completion time is invalid")
        refund.refund_status = "completed"
        refund.completed_at = completed_at
        refund.completed_by_user_id = user.id
        user_id = registration.user_id
        refund_id = refund.id
        session.commit()
    except (SQLAlchemyError, RegistrationConflictError, RegistrationResourceNotFoundError):
        session.rollback()
        raise
    result = "unavailable"
    if application_base_url:
        query = urlencode({"tournament_id": tournament_id, "registration_number": number})
        link = f"{application_base_url.rstrip('/')}/tournaments/registration?{query}"
        try:
            sender.send(from_address=from_address, recipient=accounts.read_email(user_id),
                        subject=f"Inscrição {number}: reembolso concluído",
                        body=f"A equipe registrou a conclusão do reembolso da inscrição {number}.\n\nConsulte sua inscrição: {link}\n")
            result = "sent"
        except AccountEmailReadError:
            result = "lookup_failed"
        except MailUnavailableError:
            result = "unavailable"
        except MailDeliveryError:
            result = "send_failed"
    logger.info("refund_notification", extra={"refund_id": refund_id, "delivery_result": result})
    return result
