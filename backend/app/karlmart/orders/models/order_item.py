from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class OrderItem(BaseModel):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint("unit_amount >= 0 AND unit_amount <> 'NaN'::numeric", name="ck_order_items_unit_amount_nonnegative"),
        CheckConstraint("currency = 'BRL'", name="ck_order_items_currency_brl"),
        {"schema": "public"},
    )

    order_id: Mapped[int] = mapped_column(ForeignKey("public.orders.id", ondelete="RESTRICT"), nullable=False)
    price_id: Mapped[int] = mapped_column(ForeignKey("public.prices.id", ondelete="RESTRICT"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_description: Mapped[str] = mapped_column(Text, nullable=False)
    unit_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="BRL")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
