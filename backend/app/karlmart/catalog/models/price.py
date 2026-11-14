from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class Price(BaseModel):
    __tablename__ = "prices"
    __table_args__ = (
        CheckConstraint("amount >= 0 AND amount <> 'NaN'::numeric", name="ck_prices_amount_nonnegative"),
        CheckConstraint("currency = 'BRL'", name="ck_prices_currency_brl"),
        {"schema": "public"},
    )

    product_id: Mapped[int] = mapped_column(ForeignKey("public.products.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="BRL")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
