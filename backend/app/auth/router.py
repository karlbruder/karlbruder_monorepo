"""Auth HTTP endpoints. Paths and diagnostic responses retain their existing contract."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.auth.dependencies import require_authenticated_user
from app.auth.diagnostics import check_auth_database
from app.auth.models import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/health/auth")
def health_auth():
    try:
        return check_auth_database()
    except Exception:
        # This diagnostic preserves its existing 503 response for any failed check.
        logger.exception("Supabase Auth database connectivity check failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "auth": "disconnected"},
        )


@router.get("/api/users/me", response_model=User)
def read_current_user(
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> User:
    return current_user
