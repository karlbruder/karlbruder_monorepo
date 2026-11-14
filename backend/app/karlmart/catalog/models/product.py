from sqlalchemy import Boolean, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class Product(BaseModel):
    __tablename__ = "products"
    __table_args__ = {"schema": "public"}

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
