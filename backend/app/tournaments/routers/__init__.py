"""Assemble tournament routes by the access each endpoint requires."""

from fastapi import APIRouter

from . import anonymous, authenticated, staff

router = APIRouter(tags=["tournaments"])
for access_router in (staff.router, anonymous.router, authenticated.router):
    router.include_router(access_router)
