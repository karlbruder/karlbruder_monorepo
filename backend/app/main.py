import logging
from typing import Annotated

from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.auth import require_authenticated_user
from app.database import engine, get_auth_database_engine
from app.models import User
from app.tournaments.router import router as tournaments_router
from config import settings

logger = logging.getLogger(__name__)

karlbruder_app = FastAPI()
karlbruder_app.include_router(tournaments_router)


karlbruder_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@karlbruder_app.get("/api/health")
def health() -> Response:
    return Response(status_code=status.HTTP_200_OK)


@karlbruder_app.get("/api/metadata")
def metadata():
    return {
        "git_sha": settings.GIT_SHA,
        "released_at": settings.RELEASED_AT,
    }


@karlbruder_app.get("/api/health/db")
def health_db():
    try:
        with engine.connect() as conn:
            select_one = conn.execute(text("SELECT 1")).scalar_one()
            public_schema = conn.execute(
                text(
                    """
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = 'public'
                    """
                )
            ).scalar_one_or_none()
            return {
                "status": "ok",
                "database": "connected",
                "database_url": engine.url.render_as_string(hide_password=True),
                "result": select_one,
                "schema": {
                    "public": public_schema == "public",
                },
            }
    except Exception:
        logger.exception("Domain database connectivity check failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
            },
        )


@karlbruder_app.get("/api/health/auth")
def health_auth():
    try:
        auth_engine = get_auth_database_engine()
        with auth_engine.connect() as conn:
            select_one = conn.execute(text("SELECT 1")).scalar_one()
            auth_schema = conn.execute(
                text(
                    """
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = 'auth'
                    """
                )
            ).scalar_one_or_none()
            return {
                "status": "ok",
                "auth": "connected",
                "database_url": auth_engine.url.render_as_string(hide_password=True),
                "result": select_one,
                "schema": {
                    "auth": auth_schema == "auth",
                },
            }
    except Exception:
        logger.exception("Supabase Auth database connectivity check failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "auth": "disconnected",
            },
        )


@karlbruder_app.get("/api/users/me", response_model=User)
def read_current_user(
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> User:
    return current_user
