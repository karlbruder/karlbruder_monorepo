import logging

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.auth.error_handlers import register_auth_error_handlers
from app.auth.router import router as auth_router
from app.database import engine
from app.tournaments.error_handlers import register_tournament_error_handlers
from app.tournaments.router import router as tournaments_router
from config import settings

logger = logging.getLogger(__name__)

karlbruder_app = FastAPI()
karlbruder_app.include_router(auth_router)
karlbruder_app.include_router(tournaments_router)
register_auth_error_handlers(karlbruder_app)
register_tournament_error_handlers(karlbruder_app)


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
