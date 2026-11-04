"""Create the ASGI application used by local and production servers."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.exception_handlers import register_api_exception_handlers
from app.api.router import router

karlbruder_app = FastAPI(
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
)
karlbruder_app.include_router(router)
register_api_exception_handlers(karlbruder_app)
karlbruder_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
