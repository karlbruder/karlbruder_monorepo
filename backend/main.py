import logging

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from database import classify_database_target, engine

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
            existing_schemas = set(
                conn.execute(
                    text(
                        """
                        SELECT schema_name
                        FROM information_schema.schemata
                        WHERE schema_name IN ('public', 'auth')
                        """
                    )
                ).scalars()
            )
            return {
                "status": "ok",
                "database": "connected",
                "database_target": classify_database_target(engine.url),
                "result": select_one,
                "schemas": {
                    "public": "public" in existing_schemas,
                    "auth": "auth" in existing_schemas,
                },
            }
    except Exception:
        logger.exception("Database connectivity check failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
            },
        )
