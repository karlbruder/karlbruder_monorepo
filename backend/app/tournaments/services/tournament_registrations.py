"""Create and load tournament registration rows."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth.supabase.roles import get_application_role
from app.core.files import FileStorage, FileStorageError
from app.auth.models import User
from app.tournaments.exceptions import (
    ParentalConsentFormNotAllowedError,
    ParentalConsentFormRequiredError,
    RegistrationConflictError,
    RegistrationDocumentInvalidError,
    RegistrationNotAllowedError,
    RegistrationResourceNotFoundError,
)
from app.core.files.models import StoredFile
from app.karlmart.catalog.models import Price, Product
from app.karlmart.orders.models import Order, OrderItem
from app.tournaments.models import (
    RegistrationTag,
    Tournament,
    TournamentProduct,
    TournamentRegistration,
    TournamentRegistrationDocument,
    TournamentTag,
)
from .registration_acceptances import CHOICE_FIELDS, create_acceptance, parental_consent_required
from . import tournament_local_dates
from .tournament_local_dates import is_minor_at_tournament_start
from .registration_numbers import (
    MAX_TOURNAMENT_REGISTRATION_NUMBER,
    format_tournament_registration_number,
)
from .registration_documents import (
    create_parental_consent_form_download_url,
    inspect_staged_parental_consent_form_upload,
    promote_staged_parental_consent_form_to_registration,
    validate_staged_parental_consent_form_storage_key,
    delete_storage_object_quietly,
)

if TYPE_CHECKING:
    from app.tournaments.schemas import RegistrationCreate, RegistrationDetails

_DUPLICATE_CONSTRAINTS = {
    "uq_tournament_registrations_active_user",
    "uq_tournament_registrations_active_email",
    "uq_tournament_registrations_active_document",
}
_SQLITE_DUPLICATE_COLUMNS = (
    "tournament_registrations.tournament_id, tournament_registrations.user_id",
    "tournament_registrations.tournament_id, tournament_registrations.email_normalized",
    "tournament_registrations.tournament_id, tournament_registrations.identity_document_number_normalized",
)


def normalize_tournament_registration_identity(value: str) -> str:
    """Return a normalized email or document string for duplicate checks (REG-012).

    Do not use this value as a deliverable email address.
    """

    return re.sub(r"[\s.\-]", "", value).lower()


def visible_tournament(
    session: Session, tournament_id: int, user: User, *, lock: bool = False
) -> Tournament:
    """Load a tournament the caller may see, optionally with a row lock.

    Regular users receive 404 for internal events. Missing rows also return 404.
    """

    query = select(Tournament).where(Tournament.id == tournament_id)
    if get_application_role(user) not in ("guild_member", "admin"):
        query = query.where(Tournament.is_internal.is_(False))
    if lock:
        query = query.with_for_update(of=Tournament)
    tournament = session.scalar(query)
    if tournament is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    return tournament


def list_tournament_registrations_for_staff(session: Session, tournament_id: int, actor: User) -> list[dict]:
    """Return registration summaries for staff without private contact details."""
    if get_application_role(actor) != "admin":
        raise RegistrationNotAllowedError("Guild staff access is required")
    visible_tournament(session, tournament_id, actor)
    registrations = session.scalars(
        select(TournamentRegistration)
        .options(selectinload(TournamentRegistration.documents), selectinload(TournamentRegistration.tournament))
        .where(TournamentRegistration.tournament_id == tournament_id)
        .order_by(TournamentRegistration.full_name, TournamentRegistration.id)
    ).all()
    selections = session.execute(
        select(RegistrationTag.registration_id, TournamentTag)
        .join(TournamentTag, TournamentTag.id == RegistrationTag.tag_id)
        .where(RegistrationTag.tournament_id == tournament_id)
        .order_by(TournamentTag.id)
    ).all()
    tags_by_registration: dict[int, list[TournamentTag]] = {}
    for registration_id, tag in selections:
        tags_by_registration.setdefault(registration_id, []).append(tag)
    return [
        {
            "registration_number": registration.registration_number,
            "full_name": registration.full_name,
            "social_name": registration.social_name,
            "registration_status": registration.registration_status,
            "parental_consent_required": parental_consent_required(registration),
            "tags": tags_by_registration.get(registration.id, []),
        }
        for registration in registrations
    ]


def update_tournament_registration(
    session: Session, tournament_id: int, registration_number: str, user: User,
    payload: RegistrationDetails,
) -> TournamentRegistration:
    """Correct a registration for its owner or guild staff without changing evidence."""
    visible_tournament(session, tournament_id, user, lock=True)
    registration = session.scalar(
        select(TournamentRegistration)
        .where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
        .with_for_update(of=TournamentRegistration)
    )
    if registration is None or (
        registration.user_id != user.id and get_application_role(user) != "admin"
    ):
        raise RegistrationResourceNotFoundError("Registration not found")
    if registration.registration_status == "cancelled" and get_application_role(user) != "admin":
        raise RegistrationConflictError("Cancelled registration is read-only")
    email = normalize_tournament_registration_identity(payload.email)
    document = normalize_tournament_registration_identity(payload.identity_document_number)
    if len(email.split("@")) != 2 or not all(email.split("@")) or not document:
        raise RegistrationNotAllowedError("Invalid email or identity document")
    for key, value in payload.model_dump().items():
        setattr(registration, key, value)
    registration.email_normalized = email
    registration.identity_document_number_normalized = document
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if is_duplicate_tournament_registration(exc):
            raise RegistrationConflictError("Registration already exists") from exc
        raise
    return registration


def create_tournament_registration(
    session: Session,
    tournament_id: int,
    user: User,
    payload: RegistrationCreate,
    accepted_from_ip: str,
    *,
    file_storage: FileStorage | None = None,
) -> TournamentRegistration:
    """Create a tournament registration row, assign the next registration number, and commit."""

    email_normalized = normalize_tournament_registration_identity(payload.email)
    document_normalized = normalize_tournament_registration_identity(
        payload.identity_document_number
    )
    account_email_normalized = (
        normalize_tournament_registration_identity(user.email) if user.email else ""
    )
    email_parts = email_normalized.split("@")
    if len(email_parts) != 2 or not all(email_parts) or not document_normalized:
        raise RegistrationNotAllowedError("Invalid email or identity document")
    if email_normalized != account_email_normalized:
        raise RegistrationNotAllowedError("Registration email must match account email")

    tournament = visible_tournament(session, tournament_id, user, lock=True)
    from .tournament_tags import validate_tags
    validate_tags(session, tournament_id, payload.tag_ids)
    option = session.execute(
        select(TournamentProduct, Product, Price)
        .join(Product, Product.id == TournamentProduct.product_id)
        .join(Price, Price.product_id == Product.id)
        .where(
            TournamentProduct.id == payload.tournament_product_id,
            TournamentProduct.tournament_id == tournament.id,
            Product.is_active.is_(True),
            Price.id == payload.price_id,
            Price.is_active.is_(True),
            Price.id == (
                select(Price.id)
                .where(Price.product_id == Product.id, Price.is_active.is_(True))
                .order_by(Price.id.desc())
                .limit(1)
                .correlate(Product)
                .scalar_subquery()
            ),
        )
        .with_for_update(of=(TournamentProduct, Product, Price))
    ).one_or_none()
    if option is None:
        raise RegistrationNotAllowedError("Registration option is unavailable")
    today = tournament_local_dates.current_local_calendar_date()
    if (
        tournament.registration_opens_on is None
        or tournament.registration_closes_on is None
        or tournament.is_registration_closed
        or not tournament.registration_opens_on
        <= today
        <= tournament.registration_closes_on
    ):
        raise RegistrationNotAllowedError("Registration is closed")
    if not tournament.terms_version or not tournament.rules_version:
        raise RegistrationNotAllowedError("Registration terms are not configured")
    if tournament.next_registration_number > MAX_TOURNAMENT_REGISTRATION_NUMBER:
        raise RegistrationConflictError("Registration number capacity exhausted")

    staged_storage_key = payload.parental_consent_form_storage_key
    original_file_name = payload.parental_consent_form_original_file_name
    has_staged_parental_consent_form = staged_storage_key is not None

    is_minor = is_minor_at_tournament_start(payload.birth_date, tournament.starts_at)
    if is_minor and not has_staged_parental_consent_form:
        raise ParentalConsentFormRequiredError("Parental consent form is required")
    if not is_minor and has_staged_parental_consent_form:
        raise ParentalConsentFormNotAllowedError(
            "Parental consent form is not allowed for this registration"
        )
    if has_staged_parental_consent_form and file_storage is None:
        raise FileStorageError("File storage is not configured")

    if has_staged_parental_consent_form:
        validate_staged_parental_consent_form_storage_key(
            staged_storage_key, tournament.id, user.id
        )
        inspect_staged_parental_consent_form_upload(file_storage, staged_storage_key)

    acceptance = create_acceptance(tournament, user.id, payload, accepted_from_ip)
    tournament_product, product, price = option
    order = Order(user_id=user.id, status="pending", currency=price.currency)
    session.add(order)
    session.flush()
    order_item = OrderItem(
        order_id=order.id,
        price_id=price.id,
        product_name=product.name,
        product_description=product.description,
        unit_amount=price.amount,
        currency=price.currency,
    )
    session.add(order_item)
    session.flush()
    serial = tournament.next_registration_number
    tournament.next_registration_number = serial + 1
    tournament_registration = TournamentRegistration(
        **payload.model_dump(
            exclude={
                *CHOICE_FIELDS,
                "acceptance_token",
                "acceptance_language",
                "parental_consent_form_storage_key",
                "parental_consent_form_original_file_name",
                "tournament_product_id",
                "price_id",
                "tag_ids",
            }
        ),
        tournament_id=tournament.id,
        tournament_product_id=tournament_product.id,
        order_item_id=order_item.id,
        user_id=user.id,
        registration_number=format_tournament_registration_number(
            tournament.id, serial
        ),
        registration_status="awaiting_payment",
        email_normalized=email_normalized,
        identity_document_number_normalized=document_normalized,
    )
    tournament_registration.acceptances.append(acceptance)
    session.add(tournament_registration)
    final_storage_key: str | None = None
    try:
        session.flush()
        from app.tournaments.models import RegistrationTag
        session.add_all(RegistrationTag(registration_id=tournament_registration.id, tournament_id=tournament.id, tag_id=tag_id) for tag_id in payload.tag_ids)
        if has_staged_parental_consent_form:
            final_storage_key, content_type, size_bytes = (
                promote_staged_parental_consent_form_to_registration(
                    file_storage,
                    staged_storage_key=staged_storage_key,
                    tournament_id=tournament.id,
                    registration_id=tournament_registration.id,
                )
            )
            session.add(
                TournamentRegistrationDocument(
                    registration_id=tournament_registration.id,
                    document_type="parental_consent_form",
                    file=StoredFile(
                        storage_key=final_storage_key,
                        original_file_name=original_file_name
                        or "parental-consent-form",
                        content_type=content_type,
                        size_bytes=size_bytes,
                    ),
                )
            )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        if is_duplicate_tournament_registration(exc):
            raise RegistrationConflictError("Registration already exists") from exc
        raise
    except FileStorageError:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        raise
    except Exception:
        session.rollback()
        if final_storage_key is not None:
            delete_storage_object_quietly(file_storage, final_storage_key)
        raise
    session.refresh(tournament_registration)
    return tournament_registration


def read_tournament_registration_parental_consent_form_download(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    file_storage: FileStorage,
) -> tuple[str, str, int]:
    """Return a presigned download URL for the parental consent form when the caller may read it."""

    visible_tournament(session, tournament_id, user)
    tournament_registration = session.scalar(
        select(TournamentRegistration).where(
            TournamentRegistration.tournament_id == tournament_id,
            TournamentRegistration.registration_number == registration_number,
        )
    )
    if tournament_registration is None or (
        tournament_registration.user_id != user.id
        and get_application_role(user) != "admin"
    ):
        raise RegistrationResourceNotFoundError("Registration not found")
    file_row = session.scalar(
        select(TournamentRegistrationDocument)
        .options(joinedload(TournamentRegistrationDocument.file))
        .where(
            TournamentRegistrationDocument.registration_id
            == tournament_registration.id,
            TournamentRegistrationDocument.document_type == "parental_consent_form",
        )
    )
    if file_row is None:
        raise RegistrationResourceNotFoundError("Parental consent form not found")
    return create_parental_consent_form_download_url(
        file_storage, file_row.file.storage_key
    )


def is_duplicate_tournament_registration(exc: IntegrityError) -> bool:
    """Return whether ``exc`` is a known active tournament registration uniqueness violation."""

    original = exc.orig
    if (
        getattr(original, "sqlstate", None) or getattr(original, "pgcode", None)
    ) == "23505":
        return (
            getattr(getattr(original, "diag", None), "constraint_name", None)
            in _DUPLICATE_CONSTRAINTS
        )
    message = str(original)
    return (
        message.startswith("UNIQUE constraint failed: ")
        and message.removeprefix("UNIQUE constraint failed: ")
        in _SQLITE_DUPLICATE_COLUMNS
    )

def submit_registration_parental_consent_form(
    session: Session,
    tournament_id: int,
    registration_number: str,
    user: User,
    *,
    storage_key: str,
    original_file_name: str,
    file_storage: FileStorage,
) -> TournamentRegistration:
    """Attach missing consent to an existing minor's own active registration."""
    final_key = None
    try:
        tournament = visible_tournament(session, tournament_id, user, lock=True)
        registration = session.scalar(
            select(TournamentRegistration)
            .where(
                TournamentRegistration.tournament_id == tournament_id,
                TournamentRegistration.registration_number == registration_number,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if registration is None or registration.user_id != user.id:
            raise RegistrationResourceNotFoundError("Registration not found")
        if registration.registration_status == "cancelled" or not is_minor_at_tournament_start(
            registration.birth_date, tournament.starts_at
        ):
            raise ParentalConsentFormNotAllowedError("Parental consent form is not required")
        existing = session.scalar(
            select(TournamentRegistrationDocument.id).where(
                TournamentRegistrationDocument.registration_id == registration.id,
                TournamentRegistrationDocument.document_type == "parental_consent_form",
            ).limit(1)
        )
        if existing is not None:
            raise RegistrationConflictError("Parental consent form already exists")
        name = original_file_name.strip()
        if not name:
            raise RegistrationDocumentInvalidError("Parental consent form file name is required")
        validate_staged_parental_consent_form_storage_key(storage_key, tournament_id, user.id)
        inspect_staged_parental_consent_form_upload(file_storage, storage_key)
        final_key, content_type, size = promote_staged_parental_consent_form_to_registration(
            file_storage, staged_storage_key=storage_key,
            tournament_id=tournament_id, registration_id=registration.id,
        )
        session.add(TournamentRegistrationDocument(
            registration_id=registration.id,
            document_type="parental_consent_form",
            file=StoredFile(storage_key=final_key, original_file_name=name,
                            content_type=content_type, size_bytes=size),
        ))
        session.commit()
        return registration
    except Exception:
        session.rollback()
        if final_key is not None:
            delete_storage_object_quietly(file_storage, final_key)
        raise
