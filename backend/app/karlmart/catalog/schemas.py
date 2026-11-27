"""Validated inputs and projections for shared catalog products and BRL prices."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductDetails(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)


class PriceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2, allow_inf_nan=False)


class ProductDraft(ProductDetails, PriceInput):
    pass


class ProductRead(BaseModel):
    id: int
    name: str
    description: str
    is_active: bool
    price_id: int | None
    amount: Decimal | None
    currency: str | None
