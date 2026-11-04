"""Assemble health, metadata, and domain routes without owning business rules."""

from fastapi import APIRouter

from app.api.health.router import router as health_router
from app.auth.router import router as auth_router
from app.tournaments.routers import router as tournaments_router
from config import settings

router = APIRouter()
router.include_router(auth_router)
router.include_router(tournaments_router)
router.include_router(health_router)


@router.get("/api/metadata")
def metadata():
    return {"git_sha": settings.GIT_SHA, "released_at": settings.RELEASED_AT}
