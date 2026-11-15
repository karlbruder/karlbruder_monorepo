"""List the active catalog products offered by a visible tournament."""

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentProduct
from app.tournaments.schemas import TournamentProductRead


def list_tournament_products(
    session: Session, tournament_id: int, *, can_view_internal: bool
) -> list[TournamentProductRead] | None:
    latest_price = (
        select(Price.id)
        .where(Price.product_id == Product.id, Price.is_active.is_(True))
        .order_by(Price.id.desc())
        .limit(1)
        .correlate(Product)
        .scalar_subquery()
    )
    query = (
        select(Tournament.id, TournamentProduct.id, Product.id, Product.name,
               Product.description, Price.id, Price.amount, Price.currency)
        .select_from(Tournament)
        .outerjoin(TournamentProduct, TournamentProduct.tournament_id == Tournament.id)
        .outerjoin(Product, and_(Product.id == TournamentProduct.product_id, Product.is_active.is_(True)))
        .outerjoin(Price, Price.id == latest_price)
        .where(Tournament.id == tournament_id)
        .order_by(TournamentProduct.id)
    )
    if not can_view_internal:
        query = query.where(Tournament.is_internal.is_(False))
    rows = session.execute(query).all()
    if not rows:
        return None
    return [
        TournamentProductRead(id=row[1], product_id=row[2], name=row[3],
                              description=row[4], price_id=row[5], amount=row[6],
                              currency=row[7])
        for row in rows if row[2] is not None
    ]
