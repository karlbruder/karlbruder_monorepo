from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


TournamentStatus = Literal["draft", "published", "cancelled", "archived"]
TournamentSignupStatus = Literal[
    "awaiting_payment",
    "payment_in_review",
    "confirmed",
    "waitlist",
    "cancelled",
]

BRASILIA_TIMEZONE = ZoneInfo("America/Sao_Paulo")


class TournamentFields(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    modality: str | None = Field(default=None, max_length=100)
    starts_at: datetime
    ends_at: datetime | None = None
    is_internal: bool = False
    max_competitor_capacity: int | None = Field(default=None, ge=0)
    registration_opens_at: datetime | None = None
    registration_closes_at: datetime | None = None
    payment_due_at: datetime | None = None
    inscription_fee_amount: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    location: str | None = None
    schedule: str | None = None
    regulation: str | None = None
    equipment_requirements: str | None = None
    cancellation_policy: str | None = None


class TournamentCreate(TournamentFields):
    model_config = ConfigDict(extra="forbid")

    @field_validator(
        "starts_at",
        "ends_at",
        "registration_opens_at",
        "registration_closes_at",
        "payment_due_at",
    )
    @classmethod
    def require_brasilia_offset(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("datetime must include a timezone offset")
        expected_offset = value.astimezone(BRASILIA_TIMEZONE).utcoffset()
        if value.utcoffset() != expected_offset:
            raise ValueError("datetime must use the America/Sao_Paulo UTC offset")
        return value

    @model_validator(mode="after")
    def validate_date_ranges(self) -> "TournamentCreate":
        if self.ends_at is not None and self.ends_at < self.starts_at:
            raise ValueError("ends_at must be greater than or equal to starts_at")
        if (
            self.registration_opens_at is not None
            and self.registration_closes_at is not None
            and self.registration_closes_at < self.registration_opens_at
        ):
            raise ValueError(
                "registration_closes_at must be greater than or equal to "
                "registration_opens_at"
            )
        return self


class TournamentResponse(TournamentFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: TournamentStatus
    published_at: datetime | None
    cancelled_at: datetime | None
    cancellation_reason: str | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TournamentSignupCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # tournament_id intentionally comes from the endpoint path, not this body.
    # TODO 1
    full_name: str = Field(min_length=1, max_length=255)
    social_name: str | None = Field(default=None, max_length=255)
    birth_date: date
    document_type: str = Field(min_length=1, max_length=32)
    document_issuing_country: str = Field(min_length=2, max_length=2)
    document_id: str = Field(min_length=1, max_length=64)
    email: str = Field(min_length=1, max_length=320)
    phone: str = Field(min_length=1, max_length=32)
    city: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=2, max_length=2)

    school_name: str = Field(min_length=1, max_length=255)
    responsible_instructor_name: str = Field(min_length=1, max_length=255)
    hema_practice_duration: str | None = Field(default=None, max_length=100)
    hema_practice_start_year: int | None = Field(default=None, gt=0)
    prior_tournaments_count: int | None = Field(default=None, ge=0)
    hema_ratings_ref: str | None = Field(default=None, max_length=255)
    special_category_note: str | None = None

    emergency_contact_name: str = Field(min_length=1, max_length=255)
    emergency_contact_phone: str = Field(min_length=1, max_length=32)
    declares_required_equipment: bool
    declares_physically_fit: bool
    show_on_public_list: bool = False


class TournamentSignupResponse(BaseModel):
    """Minimal receipt returned after a public tournament signup."""

    model_config = ConfigDict(from_attributes=True)

    inscription_number: str
    lookup_token: str
    status: TournamentSignupStatus
