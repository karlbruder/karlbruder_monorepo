"""Explicit tournament API contracts. Private registration fields stay in the model."""

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID
from urllib.parse import urlsplit

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    field_validator,
    model_validator,
)

from app.tournaments.services import TOURNAMENT_SLUG_PATTERN


class TournamentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    slug: str | None = None
    description: str | None = None
    discipline: str | None = Field(default=None, max_length=80)
    starts_at: AwareDatetime
    ends_at: AwareDatetime | None = None
    is_internal: bool
    competitor_capacity: int | None = Field(default=None, ge=0)
    registration_opens_on: date | None = None
    registration_closes_on: date | None = None
    is_registration_closed: bool = False
    payment_due_at: AwareDatetime | None = None
    registration_fee_amount: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    location: str | None = Field(default=None, max_length=300)
    schedule: str | None = None
    rules_text: str | None = None
    rules_url: str | None = None
    rules_version: str | None = Field(default=None, max_length=100)
    terms_version: str | None = Field(default=None, max_length=100)
    equipment_requirements: str | None = None
    cancellation_policy_text: str | None = None
    cancellation_policy_url: str | None = None
    pix_key: str | None = Field(default=None, max_length=512)

    @field_validator("rules_url", "cancellation_policy_url")
    @classmethod
    def validate_policy_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or any(c.isspace() for c in value)
        ):
            raise ValueError("Policy URLs must use HTTP or HTTPS")
        return value

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tournament name cannot be blank")
        return value

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not re.fullmatch(TOURNAMENT_SLUG_PATTERN, value) or len(value) > 100:
            raise ValueError(
                "Tournament slug must be lowercase words separated by single hyphens"
            )
        return value

    @model_validator(mode="after")
    def validate_date_order(self) -> "TournamentCreate":
        if self.ends_at is not None and self.ends_at < self.starts_at:
            raise ValueError("ends_at must not precede starts_at")
        if (
            self.registration_opens_on is not None
            and self.registration_closes_on is not None
            and self.registration_closes_on < self.registration_opens_on
        ):
            raise ValueError(
                "registration_closes_on must not precede registration_opens_on"
            )
        return self


class TournamentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    discipline: str | None
    starts_at: datetime
    ends_at: datetime | None
    is_internal: bool
    competitor_capacity: int | None
    registration_opens_on: date | None
    registration_closes_on: date | None
    is_registration_closed: bool
    payment_due_at: datetime | None
    registration_fee_amount: Decimal | None
    location: str | None
    schedule: str | None
    rules_text: str | None
    rules_url: str | None
    rules_version: str | None
    terms_version: str | None
    equipment_requirements: str | None
    cancellation_policy_text: str | None
    cancellation_policy_url: str | None
    acceptance_content: dict[str, dict]
    acceptance_tokens: dict[str, str]
    rules_archive_url: str | None
    cancellation_policy_archive_url: str | None
    created_at: datetime


class TournamentList(BaseModel):
    items: list[TournamentRead]
    total: int
    limit: int
    offset: int


class StaffTournamentRead(TournamentRead):
    pix_key: str | None


class StaffTournamentList(BaseModel):
    items: list[StaffTournamentRead]
    total: int
    limit: int
    offset: int


class RegistrationCreate(BaseModel):
    """Participant-supplied fields only. Ownership and acceptance evidence are server-owned."""

    model_config = ConfigDict(extra="forbid")

    acceptance_token: str = Field(pattern=r"^[a-f0-9]{64}$")
    acceptance_language: Literal["pt", "en"]
    full_name: str = Field(min_length=1, max_length=200)
    social_name: str | None = Field(default=None, max_length=200)
    birth_date: date
    identity_document_type: Literal["cpf", "passport"]
    identity_document_number: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=1, max_length=320)
    phone: str = Field(min_length=1, max_length=40)
    city: str = Field(min_length=1, max_length=150)
    state_or_province: str | None = Field(default=None, max_length=150)
    country: str = Field(min_length=1, max_length=150)
    school_or_team_name: str | None = Field(default=None, max_length=200)
    instructor_name: str | None = Field(default=None, max_length=200)
    hema_experience_description: str | None = Field(default=None, max_length=100)
    hema_started_year: int | None = Field(default=None, ge=1)
    previous_tournament_count: int = Field(ge=0)
    hema_ratings_reference: str | None = Field(default=None, max_length=300)
    handedness: Literal["right", "left", "ambidextrous"] | None = None
    category_or_eligibility_note: str | None = None
    emergency_contact_name: str = Field(min_length=1, max_length=200)
    emergency_contact_phone: str = Field(min_length=1, max_length=40)
    declares_truthful_information: StrictBool
    declares_has_required_equipment: StrictBool
    declares_physically_fit: StrictBool
    accepts_rules: StrictBool
    accepts_data_processing: StrictBool
    acknowledges_inherent_risks: StrictBool
    accepts_cancellation_policy: StrictBool
    authorizes_image_use: StrictBool
    parental_consent_form_storage_key: str | None = Field(default=None, max_length=512)
    parental_consent_form_original_file_name: str | None = Field(
        default=None, max_length=255
    )

    @field_validator(
        "full_name",
        "identity_document_number",
        "email",
        "phone",
        "city",
        "country",
        "emergency_contact_name",
        "emergency_contact_phone",
    )
    @classmethod
    def require_visible_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Required text cannot be blank")
        return value

    @field_validator(
        "declares_truthful_information",
        "declares_has_required_equipment",
        "declares_physically_fit",
        "accepts_rules",
        "accepts_data_processing",
        "acknowledges_inherent_risks",
        "accepts_cancellation_policy",
    )
    @classmethod
    def require_declaration(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Required declaration must be accepted")
        return value

    @model_validator(mode="after")
    def require_hema_experience(self) -> "RegistrationCreate":
        if (
            not (self.hema_experience_description or "").strip()
            and self.hema_started_year is None
        ):
            raise ValueError("HEMA practice duration or start year is required")
        if (
            self.parental_consent_form_storage_key
            and not (self.parental_consent_form_original_file_name or "").strip()
        ):
            raise ValueError(
                "Parental consent form original file name is required when a storage key is sent"
            )
        return self


class ParentalConsentFormUploadUrlRead(BaseModel):
    storage_key: str
    upload_url: str
    expires_in_seconds: int
    required_headers: dict[str, str]


class ParentalConsentFormDownloadUrlRead(BaseModel):
    download_url: str
    content_type: str
    expires_in_seconds: int


class PaymentProofUploadUrlRead(BaseModel):
    storage_key: str
    upload_url: str
    expires_in_seconds: int
    required_headers: dict[str, str]


class PaymentProofSubmitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    storage_key: str = Field(min_length=1, max_length=512)
    original_file_name: str = Field(min_length=1, max_length=255)


class PaymentProofDownloadUrlRead(BaseModel):
    download_url: str
    content_type: str
    expires_in_seconds: int


class RegistrationPaymentProofSummary(BaseModel):
    original_file_name: str
    content_type: str
    size_bytes: int
    submitted_at: datetime


class PixPaymentOptionRead(BaseModel):
    pix_key: str | None


class RegistrationPaymentOptions(BaseModel):
    pix: PixPaymentOptionRead


class CurrentPaymentProofReview(BaseModel):
    document_id: int
    decision: str
    rejection_reason: str | None
    reviewed_at: datetime


class RegistrationPaymentInstructions(BaseModel):
    registration_number: str
    registration_status: str
    registration_fee_amount: Decimal | None
    amount_received: Decimal | None = None
    payment_due_at: datetime | None
    payment_options: RegistrationPaymentOptions
    latest_payment_proof: RegistrationPaymentProofSummary | None
    current_review: CurrentPaymentProofReview | None = None


class RegistrationRead(BaseModel):
    """Owner-only registration view. Never exposes staff-only safety notes or IP evidence."""

    model_config = ConfigDict(from_attributes=True)

    tournament_id: int
    registration_number: str
    registration_status: str
    full_name: str
    social_name: str | None
    birth_date: date
    identity_document_type: str
    identity_document_number: str
    email: str
    phone: str
    city: str
    state_or_province: str | None
    country: str
    school_or_team_name: str | None
    instructor_name: str | None
    hema_experience_description: str | None
    hema_started_year: int | None
    previous_tournament_count: int
    hema_ratings_reference: str | None
    handedness: str | None
    category_or_eligibility_note: str | None
    emergency_contact_name: str
    emergency_contact_phone: str
    declares_truthful_information: bool
    declares_has_required_equipment: bool
    declares_physically_fit: bool
    accepts_rules: bool
    accepts_data_processing: bool
    acknowledges_inherent_risks: bool
    accepts_cancellation_policy: bool
    authorizes_image_use: bool
    accepted_terms_version: str
    accepted_rules_version: str
    accepted_at: datetime
    created_at: datetime
    updated_at: datetime


class StaffRegistrationRead(RegistrationRead):
    """Complete staff view, including restricted safety and acceptance evidence."""

    id: int
    user_id: UUID
    email_normalized: str
    identity_document_number_normalized: str
    accepted_from_ip: str
    staff_safety_note: str | None


class StaffPaymentReviewQueueItem(BaseModel):
    registration_number: str
    tournament_id: int
    tournament_name: str
    full_name: str
    registration_status: str
    document_id: int
    submitted_at: datetime


class StaffPaymentReviewQueue(BaseModel):
    items: list[StaffPaymentReviewQueueItem]
    total: int
    limit: int
    offset: int


class PaymentProofReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    decision: str
    reviewed_by_user_id: UUID
    reviewed_at: datetime
    rejection_reason: str | None


class StaffReviewDocumentRead(BaseModel):
    id: int
    document_type: str
    original_file_name: str
    content_type: str
    size_bytes: int
    submitted_at: datetime


class StaffPaymentReviewDetail(BaseModel):
    registration: StaffRegistrationRead
    tournament_name: str
    registration_fee_amount: Decimal | None
    payment_due_at: datetime | None
    competitor_capacity: int | None
    confirmed_count: int
    equipment_requirements: str | None
    latest_document_id: int | None
    documents: list[StaffReviewDocumentRead]
    reviews: list[PaymentProofReviewRead]


class PaymentReviewDecisionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    decision: Literal["approved", "rejected"]
    amount_received: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2, allow_inf_nan=False
    )
    requirements_checked: StrictBool = False
    rejection_reason: str | None = None

    @model_validator(mode="after")
    def require_decision_evidence(self) -> "PaymentReviewDecisionCreate":
        if self.decision == "approved":
            if self.amount_received is None or not self.requirements_checked:
                raise ValueError(
                    "Approval requires amount_received and checked participation requirements"
                )
            if self.rejection_reason is not None:
                raise ValueError("Approval cannot include a rejection reason")
        else:
            self.rejection_reason = (self.rejection_reason or "").strip()
            if not self.rejection_reason:
                raise ValueError("Rejection requires a reason")
            if self.amount_received is not None:
                raise ValueError("Rejection cannot include a received amount")
        return self


class PaymentReviewDecisionRead(BaseModel):
    review: PaymentProofReviewRead
    registration_status: str
    notification_result: Literal[
        "not_required", "sent", "lookup_failed", "unavailable", "send_failed"
    ]
