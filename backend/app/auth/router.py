"""Authenticated identity endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_authenticated_user
from app.auth.models import User

router = APIRouter()


@router.get("/api/users/me", response_model=User)
def read_current_user(
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> User:
    return current_user
