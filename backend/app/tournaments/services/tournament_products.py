"""List the active catalog products offered by a tournament."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import TournamentProduct
from app.tournaments.schemas import TournamentProductRead


def list_tournament_products(session: Session, tournament_id: int) -> list[TournamentProductRead]:
    latest_price = (
        select(Price.id)
        .where(Price.product_id == Product.id, Price.is_active.is_(True))
        .order_by(Price.id.desc())
        .limit(1)
        .correlate(Product)
        .scalar_subquery()
    )
    rows = session.execute(
        select(TournamentProduct.id, Product.id, Product.name, Product.description,
               Price.id, Price.amount, Price.currency)
        .join(Product, Product.id == TournamentProduct.product_id)
        .outerjoin(Price, Price.id == latest_price)
        .where(TournamentProduct.tournament_id == tournament_id, Product.is_active.is_(True))
        .order_by(TournamentProduct.id)
    ).all()
    return [TournamentProductRead(id=row[0], product_id=row[1], name=row[2],
                                  description=row[3], price_id=row[4], amount=row[5],
                                  currency=row[6]) for row in rows]
