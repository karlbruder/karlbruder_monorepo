from uuid import UUID

from sqlalchemy import CheckConstraint, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class Order(BaseModel):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("currency = 'BRL'", name="ck_orders_currency_brl"),
        {"schema": "public"},
    )

    user_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="BRL")
