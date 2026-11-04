"""Create the ASGI application used by local and production servers."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.exception_handlers import register_api_exception_handlers
from app.api.router import router
from app.core import db
from config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    database_url = settings.get_database_url()
    sync_engine = db.create_sync_engine(database_url)
    async_engine = None
    try:
        async_engine = db.create_async_engine_instance(database_url)
        db.sync_engine = sync_engine
        db.async_engine = async_engine
        db.sync_session_maker = db.create_sync_session_maker(sync_engine)
        db.async_session_maker = db.create_async_session_maker(async_engine)
        yield
    finally:
        db.sync_session_maker = None
        db.async_session_maker = None
        db.sync_engine = None
        db.async_engine = None
        try:
            if async_engine is not None:
                await async_engine.dispose()
        finally:
            sync_engine.dispose()


karlbruder_app = FastAPI(
    lifespan=lifespan,
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
