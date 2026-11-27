"""Create and load tournament registration rows."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth.supabase.roles import get_application_role
from app.core.files import FileStorage, FileStorageError
from app.auth.exceptions import AdminAccessRequiredException
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
from app.karlmart.catalog import services as catalog
from app.karlmart.orders.models import Order, OrderItem
from app.tournaments.models import (
    RegistrationTag,
    Tournament,
    TournamentProduct,
    TournamentRegistration,
    TournamentRegistrationDocument,
    TournamentTag,
)
from .registration_acceptances import CHOICE_FIELDS, create_registration_acceptance
from .tournament_catalog import load_visible_tournament
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
    from app.tournaments.schemas import RegistrationCreate, RegistrationDetails, RegistrationRead

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


def list_personal_registrations(session: Session, user: User) -> list[dict]:
    """List only the authenticated account's registrations across tournaments."""
    rows = session.execute(
        select(TournamentRegistration, Tournament.name)
        .join(Tournament, Tournament.id == TournamentRegistration.tournament_id)
        .where(TournamentRegistration.user_id == user.id)
        .order_by(TournamentRegistration.id.desc())
    ).all()
    return [
        {"tournament_id": registration.tournament_id, "tournament_name": name,
         "registration_number": registration.registration_number,
         "registration_status": registration.registration_status}
        for registration, name in rows
    ]


def list_tournament_registrations_for_staff(session: Session, tournament_id: int, actor: User) -> list[dict]:
    """Return registration summaries for staff without private contact details."""
    if get_application_role(actor) != "admin":
        raise RegistrationNotAllowedError("Guild staff access is required")
    load_visible_tournament(session, tournament_id, actor)
    registrations = session.scalars(
        select(TournamentRegistration)
        .options(selectinload(TournamentRegistration.documents), selectinload(TournamentRegistration.tournament), selectinload(TournamentRegistration.order_item))
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
            "product_name": registration.order_item.product_name if registration.order_item else None,
            "parental_consent_required": is_registration_parental_consent_required(registration),
            "tags": tags_by_registration.get(registration.id, []),
        }
        for registration in registrations
    ]


def update_tournament_registration(
    session: Session, tournament_id: int, registration_number: str, user: User,
    payload: RegistrationDetails,
) -> TournamentRegistration:
    """Correct a registration for its owner or guild staff without changing evidence."""
    load_visible_tournament(session, tournament_id, user, lock=True)
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

    tournament = load_visible_tournament(session, tournament_id, user, lock=True)
    from .tournament_tags import validate_tags
    validate_tags(session, tournament_id, payload.tag_ids)
    offering = session.scalar(select(TournamentProduct).where(
        TournamentProduct.id == payload.tournament_product_id,
        TournamentProduct.tournament_id == tournament.id,
    ))
    product = catalog.get_product(session, offering.product_id, lock=True) if offering else None
    price = catalog.current_price(session, product.id) if product else None
    if product is None or not product.is_active or price is None or price.id != payload.price_id:
        raise RegistrationNotAllowedError("Registration option is unavailable")
    tournament_product = offering
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

    acceptance = create_registration_acceptance(
        session, tournament, user.id, payload, accepted_from_ip
    )
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

    load_visible_tournament(session, tournament_id, user)
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
        tournament = load_visible_tournament(session, tournament_id, user, lock=True)
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

def is_registration_parental_consent_required(registration: TournamentRegistration) -> bool:
    return (
        registration.registration_status != "cancelled"
        and is_minor_at_tournament_start(registration.birth_date, registration.tournament.starts_at)
        and not any(document.document_type == "parental_consent_form" for document in registration.documents)
    )


def build_tournament_registration_read(registration: TournamentRegistration, *, staff: bool = False) -> RegistrationRead:
    """Read the latest snapshot through the established owner or staff allowlist."""
    from app.tournaments.schemas import RegistrationRead, StaffRegistrationRead

    schema = StaffRegistrationRead if staff else RegistrationRead
    snapshot = registration.acceptances[-1]
    evidence_fields = {
        *CHOICE_FIELDS, "accepted_at", "accepted_from_ip",
        "rules_version_id", "cancellation_policy_version_id",
    }
    values = {
        name: getattr(snapshot if name in evidence_fields else registration, name)
        for name in schema.model_fields if name not in {"parental_consent_required", "product_name", "product_description"}
    }
    values["product_name"] = registration.order_item.product_name if registration.order_item else None
    values["product_description"] = registration.order_item.product_description if registration.order_item else None
    values["parental_consent_required"] = is_registration_parental_consent_required(registration)
    return schema(**values)


def list_tournament_registrations(
    session: Session, tournament_id: int, user: User
) -> list[RegistrationRead]:
    load_visible_tournament(session, tournament_id, user)
    query = (select(TournamentRegistration)
        .options(joinedload(TournamentRegistration.tournament), selectinload(TournamentRegistration.documents))
        .where(TournamentRegistration.tournament_id == tournament_id)
        .order_by(TournamentRegistration.id))
    staff = get_application_role(user) == "admin"
    if not staff:
        query = query.where(TournamentRegistration.user_id == user.id)
    return [build_tournament_registration_read(registration, staff=staff) for registration in session.scalars(query)]


def read_tournament_registration(
    session: Session, tournament_id: int, number: str, user: User
) -> RegistrationRead:
    load_visible_tournament(session, tournament_id, user)
    registration = session.scalar(select(TournamentRegistration).where(
        TournamentRegistration.tournament_id == tournament_id,
        TournamentRegistration.registration_number == number,
    ))
    staff = get_application_role(user) == "admin"
    if registration is None or (registration.user_id != user.id and not staff):
        raise RegistrationResourceNotFoundError("Registration not found")
    return build_tournament_registration_read(registration, staff=staff)


def registration_totals(session: Session, actor: User, tournament_id: int):
    """Count every registration and confirmed seat for one tournament."""
    if get_application_role(actor) != "admin":
        raise AdminAccessRequiredException()
    tournament = session.get(Tournament, tournament_id)
    if tournament is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    total, confirmed = session.execute(select(
        func.count(TournamentRegistration.id),
        func.count(TournamentRegistration.id).filter(TournamentRegistration.registration_status == "confirmed"),
    ).where(TournamentRegistration.tournament_id == tournament_id)).one()
    return {"total": total, "confirmed_count": confirmed, "competitor_capacity": tournament.competitor_capacity}
