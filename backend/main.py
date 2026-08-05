import logging
from typing import Annotated

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from auth import get_current_user
from database import engine, get_auth_database_engine
from models import CurrentUser

logger = logging.getLogger(__name__)

karlbruder_app = FastAPI()


karlbruder_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@karlbruder_app.get("/")
def read_root():
    return {"Hello": "World"}


@karlbruder_app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "backend",
        "message": "Backend is alive",
    }


@karlbruder_app.get("/health/db")
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


@karlbruder_app.get("/health/auth")
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


@karlbruder_app.get("/api/users/me", response_model=CurrentUser)
def read_current_user(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    return current_user
