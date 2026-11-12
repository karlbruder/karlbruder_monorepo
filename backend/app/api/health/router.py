"""API liveness and database health endpoints."""

import logging

from fastapi import APIRouter, Response, status
from fastapi.responses import JSONResponse

from app.api.health.checks import check_auth_database, check_domain_database
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(settings.HEALTH_CHECK_PATH)
def health() -> Response:
    return Response(status_code=status.HTTP_200_OK)


@router.get(settings.HEALTH_DB_CHECK_PATH)
def health_db():
    try:
        return check_domain_database()
    except Exception:
        # Diagnostic failures retain their existing 503 contract, regardless of cause.
        logger.exception("Domain database connectivity check failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "database": "disconnected"},
        )


@router.get(settings.HEALTH_AUTH_CHECK_PATH)
def health_auth():
    try:
        return check_auth_database()
    except Exception:
        # Diagnostic failures retain their existing 503 contract, regardless of cause.
        logger.exception("Supabase Auth database connectivity check failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "auth": "disconnected"},
        )
