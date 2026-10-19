"""Explicit tournament API contracts; private signup fields stay in the model."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator


class TournamentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    modality: str | None = Field(default=None, max_length=80)
    starts_at: AwareDatetime
    ends_at: AwareDatetime | None = None
    is_internal: bool
    max_competitor_capacity: int | None = Field(default=None, ge=0)
    registration_opens_on: date | None = None
    registration_closes_on: date | None = None
    new_registrations_closed: bool = False
    payment_due_at: AwareDatetime | None = None
    inscription_fee_amount: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    location: str | None = Field(default=None, max_length=300)
    schedule: str | None = None
    regulation: str | None = None
    regulation_version: str | None = Field(default=None, max_length=100)
    terms_version: str | None = Field(default=None, max_length=100)
    equipment_requirements: str | None = None
    cancellation_policy: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tournament name cannot be blank")
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
            raise ValueError("registration_closes_on must not precede registration_opens_on")
        return self


class TournamentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    modality: str | None
    starts_at: datetime
    ends_at: datetime | None
    is_internal: bool
    max_competitor_capacity: int | None
    registration_opens_on: date | None
    registration_closes_on: date | None
    new_registrations_closed: bool
    payment_due_at: datetime | None
    inscription_fee_amount: Decimal | None
    location: str | None
    schedule: str | None
    regulation: str | None
    regulation_version: str | None
    terms_version: str | None
    equipment_requirements: str | None
    cancellation_policy: str | None
    created_at: datetime


class SignupCreate(BaseModel):
    """Participant-supplied fields only; ownership and acceptance evidence are server-owned."""

    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1, max_length=200)
    social_name: str | None = Field(default=None, max_length=200)
    birth_date: date
    document_type: Literal["cpf", "passport"]
    document_id: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=1, max_length=320)
    phone: str = Field(min_length=1, max_length=40)
    city: str = Field(min_length=1, max_length=150)
    state: str | None = Field(default=None, max_length=150)
    country: str = Field(min_length=1, max_length=150)
    school_name: str | None = Field(default=None, max_length=200)
    responsible_instructor_name: str | None = Field(default=None, max_length=200)
    hema_practice_duration: str | None = Field(default=None, max_length=100)
    hema_practice_start_year: int | None = Field(default=None, ge=1)
    prior_tournaments_count: int = Field(ge=0)
    hema_ratings_ref: str | None = Field(default=None, max_length=300)
    handedness: Literal["right", "left", "ambidextrous"] | None = None
    special_category_note: str | None = None
    emergency_contact_name: str = Field(min_length=1, max_length=200)
    emergency_contact_phone: str = Field(min_length=1, max_length=40)
    declares_required_equipment: StrictBool
    declares_physically_fit: StrictBool
    accepts_regulation: StrictBool
    accepts_data_processing: StrictBool
    acknowledges_inherent_risks: StrictBool
    accepts_cancellation_policy: StrictBool
    image_use_authorized: StrictBool

    @field_validator(
        "full_name", "document_id", "email", "phone", "city", "country",
        "emergency_contact_name", "emergency_contact_phone"
    )
    @classmethod
    def require_visible_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Required text cannot be blank")
        return value

    @field_validator(
        "declares_required_equipment", "declares_physically_fit", "accepts_regulation",
        "accepts_data_processing", "acknowledges_inherent_risks", "accepts_cancellation_policy"
    )
    @classmethod
    def require_declaration(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Required declaration must be accepted")
        return value

    @model_validator(mode="after")
    def require_hema_experience(self) -> "SignupCreate":
        if not (self.hema_practice_duration or "").strip() and self.hema_practice_start_year is None:
            raise ValueError("HEMA practice duration or start year is required")
        return self


class SignupRead(BaseModel):
    """Owner-only registration view; never exposes staff-only safety notes or IP evidence."""

    model_config = ConfigDict(from_attributes=True)

    tournament_id: int
    inscription_number: str
    status: str
    full_name: str
    social_name: str | None
    birth_date: date
    document_type: str
    document_id: str
    email: str
    phone: str
    city: str
    state: str | None
    country: str
    school_name: str | None
    responsible_instructor_name: str | None
    hema_practice_duration: str | None
    hema_practice_start_year: int | None
    prior_tournaments_count: int
    hema_ratings_ref: str | None
    handedness: str | None
    special_category_note: str | None
    emergency_contact_name: str
    emergency_contact_phone: str
    declares_required_equipment: bool
    declares_physically_fit: bool
    accepts_regulation: bool
    accepts_data_processing: bool
    acknowledges_inherent_risks: bool
    accepts_cancellation_policy: bool
    image_use_authorized: bool
    accepted_terms_version: str
    accepted_regulation_version: str
    accepted_at: datetime
    created_at: datetime
    updated_at: datetime


class StaffSignupRead(SignupRead):
    """Complete staff view, including restricted safety and acceptance evidence."""

    id: int
    user_id: UUID
    email_normalized: str
    document_id_normalized: str
    acceptance_ip: str
    safety_note: str | None
