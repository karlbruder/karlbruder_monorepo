"""List the active catalog products offered by a visible tournament."""

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import AnonymousUser, User
from app.auth.supabase.roles import get_application_role
from app.karlmart.catalog import services as catalog
from app.tournaments.exceptions import RegistrationConflictError, RegistrationResourceNotFoundError
from app.tournaments.services.tournament_catalog import can_view_internal_tournaments
from app.karlmart.catalog.models import Price, Product
from app.tournaments.models import Tournament, TournamentProduct
from app.tournaments.schemas import OfferingInput, StaffProductRead, TournamentProductRead


def list_tournament_products(
    session: Session, tournament_id: int, user: User | AnonymousUser
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
    if not can_view_internal_tournaments(user):
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


def list_staff_tournament_products(
    session: Session, actor: User, tournament_id: int | None = None,
) -> list[StaffProductRead]:
    """Combine the shared catalog with tournament-owned associations."""
    _require_admin(actor)
    if tournament_id is not None and session.get(Tournament, tournament_id) is None:
        raise RegistrationResourceNotFoundError("Tournament not found")
    products = catalog.list_products(session, actor)
    links = session.execute(
        select(TournamentProduct.product_id, Tournament.id, Tournament.name)
        .join(Tournament, Tournament.id == TournamentProduct.tournament_id)
        .order_by(Tournament.name, Tournament.id)
    ).all()
    tournaments: dict[int, list[dict]] = {}
    for product_id, event_id, name in links:
        tournaments.setdefault(product_id, []).append({"id": event_id, "name": name})
    return [
        StaffProductRead(**product.model_dump(), tournaments=tournaments.get(product.id, []))
        for product in products
        if tournament_id is None or any(
            event["id"] == tournament_id for event in tournaments.get(product.id, [])
        )
    ]


def add_offerings(session: Session, actor: User, tournament: Tournament, payload: OfferingInput) -> None:
    """Attach products within the tournament creation or update transaction."""
    _require_admin(actor)
    if len(payload.existing_product_ids) != len(set(payload.existing_product_ids)):
        raise RegistrationConflictError("Duplicate product")
    for product_id in sorted(payload.existing_product_ids):
        product = catalog.require_active_product(session, product_id, lock=True)
        if session.scalar(select(TournamentProduct.id).where(
            TournamentProduct.tournament_id == tournament.id,
            TournamentProduct.product_id == product.id,
        )) is not None:
            raise RegistrationConflictError("Product already offered")
        session.add(TournamentProduct(tournament_id=tournament.id, product_id=product.id))
    for draft in payload.new_products:
        product = catalog.create_product(session, draft)
        session.add(TournamentProduct(tournament_id=tournament.id, product_id=product.id))
    session.flush()


def attach_tournament_products(session: Session, actor: User, tournament_id: int, payload: OfferingInput) -> list[StaffProductRead]:
    _require_admin(actor)
    try:
        tournament = session.scalar(select(Tournament).where(Tournament.id == tournament_id).with_for_update(of=Tournament))
        if tournament is None:
            raise RegistrationResourceNotFoundError("Tournament not found")
        add_offerings(session, actor, tournament, payload)
        result = list_staff_tournament_products(session, actor, tournament_id)
        session.commit()
        return result
    except Exception:
        session.rollback()
        raise


def _require_admin(actor: User) -> None:
    if get_application_role(actor) != "admin":
        raise AdminAccessRequiredException()
