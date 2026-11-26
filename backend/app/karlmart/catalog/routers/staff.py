"""Shared catalog resources for guild staff."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.models import User
from app.core.db.session import get_session
from app.karlmart.catalog.schemas import PriceInput, ProductDetails, ProductRead
from app.karlmart.catalog import services

router = APIRouter(prefix="/api/staff/products", tags=["catalog"])


@router.get("", response_model=list[ProductRead])
def list_products(admin: Annotated[User, Depends(require_admin)], session: Annotated[Session, Depends(get_session)]):
    return services.list_products(session, admin)


@router.patch("/{product_id}", response_model=ProductRead)
def edit_product(product_id: int, payload: ProductDetails, admin: Annotated[User, Depends(require_admin)], session: Annotated[Session, Depends(get_session)]):
    return services.change_product(session, admin, product_id, details=payload)


@router.post("/{product_id}/prices", response_model=ProductRead, status_code=201)
def add_price(product_id: int, payload: PriceInput, admin: Annotated[User, Depends(require_admin)], session: Annotated[Session, Depends(get_session)]):
    return services.change_product(session, admin, product_id, amount=payload.amount)


@router.post("/{product_id}/deactivate", response_model=ProductRead)
def deactivate_product(product_id: int, admin: Annotated[User, Depends(require_admin)], session: Annotated[Session, Depends(get_session)]):
    return services.change_product(session, admin, product_id, deactivate=True)
