"""Shared product and price operations."""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.exceptions import AdminAccessRequiredException
from app.auth.models import User
from app.auth.supabase.roles import get_application_role
from app.karlmart.catalog.exceptions import ProductInactiveError, ProductNotFoundError
from app.karlmart.catalog.models import Price, Product
from app.karlmart.catalog.schemas import ProductDetails, ProductDraft, ProductRead


def _require_admin(actor: User) -> None:
    if get_application_role(actor) != "admin":
        raise AdminAccessRequiredException()


def get_product(session: Session, product_id: int, *, lock: bool = False) -> Product:
    query = select(Product).where(Product.id == product_id).execution_options(populate_existing=True)
    if lock:
        query = query.with_for_update(of=Product)
    product = session.scalar(query)
    if product is None:
        raise ProductNotFoundError("Product not found")
    return product


def require_active_product(session: Session, product_id: int, *, lock: bool = False) -> Product:
    product = get_product(session, product_id, lock=lock)
    if not product.is_active:
        raise ProductInactiveError("Product is inactive")
    return product


def current_price(session: Session, product_id: int) -> Price | None:
    return session.scalar(select(Price).where(
        Price.product_id == product_id, Price.is_active.is_(True)
    ).order_by(Price.id.desc()).limit(1).execution_options(populate_existing=True))


def product_read(product: Product, price: Price | None) -> ProductRead:
    return ProductRead(id=product.id, name=product.name, description=product.description,
                       is_active=product.is_active, price_id=price.id if price else None,
                       amount=price.amount if price else None, currency=price.currency if price else None)


def list_products(session: Session, actor: User) -> list[ProductRead]:
    _require_admin(actor)
    latest = (select(Price.id).where(Price.product_id == Product.id, Price.is_active.is_(True))
              .order_by(Price.id.desc()).limit(1).correlate(Product).scalar_subquery())
    return [product_read(product, price) for product, price in session.execute(
        select(Product, Price).outerjoin(Price, Price.id == latest).order_by(Product.id)
    )]


def create_product(session: Session, draft: ProductDraft) -> Product:
    """Create a product and initial price in the caller's transaction."""
    product = Product(name=draft.name, description=draft.description, is_active=True)
    session.add(product)
    session.flush()
    session.add(Price(product_id=product.id, amount=draft.amount, currency="BRL", is_active=True))
    session.flush()
    return product


def change_product(session: Session, actor: User, product_id: int, *,
                   details: ProductDetails | None = None, amount: Decimal | None = None,
                   deactivate: bool = False) -> ProductRead:
    _require_admin(actor)
    try:
        product = require_active_product(session, product_id, lock=True)
        price = current_price(session, product.id)
        if details is not None:
            product.name = details.name
            product.description = details.description
        if amount is not None and (price is None or price.amount != amount):
            price = Price(product_id=product.id, amount=amount, currency="BRL", is_active=True)
            session.add(price)
        if deactivate:
            product.is_active = False
        session.flush()
        result = product_read(product, price)
        session.commit()
        return result
    except Exception:
        session.rollback()
        raise
