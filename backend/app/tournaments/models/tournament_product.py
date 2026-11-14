"""A catalog product offered for a tournament."""

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import BaseModel


class TournamentProduct(BaseModel):
    __tablename__ = "tournament_products"
    __table_args__ = (
        UniqueConstraint(
            "tournament_id", "product_id", name="uq_tournament_products_tournament_product"
        ),
        {"schema": "public"},
    )

    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("public.tournaments.id", ondelete="RESTRICT"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("public.products.id", ondelete="RESTRICT"), nullable=False
    )
