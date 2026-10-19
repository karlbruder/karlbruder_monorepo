"""Explicit tournament API contracts; private signup fields stay in the model."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator


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
