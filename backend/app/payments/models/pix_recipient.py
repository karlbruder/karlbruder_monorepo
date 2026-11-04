"""Registered Pix key used to receive off-platform payments."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PixRecipient(Base):
    __tablename__ = "pix_recipients"
    __table_args__ = ({"schema": "public"},)

    id: Mapped[int] = mapped_column(primary_key=True)
    pix_key: Mapped[str] = mapped_column(String(512), nullable=False)
