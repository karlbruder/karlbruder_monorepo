"""Create the ASGI application used by local and production servers."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.exception_handlers import register_api_exception_handlers
from app.api.router import router
from app.auth.supabase.account_email import SupabaseAccountEmailReader
from app.core import db
from app.core.mail import SmtpMailSender
from app.middlewares.structlog_request_middleware import StructlogRequestMiddleware
from config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    database_url = settings.get_database_url()
    sync_engine = db.create_sync_engine(database_url)
    async_engine = None
    auth_engine = None
    try:
        async_engine = db.create_async_engine_instance(database_url)
        db.sync_engine = sync_engine
        db.async_engine = async_engine
        db.sync_session_maker = db.create_sync_session_maker(sync_engine)
        db.async_session_maker = db.create_async_session_maker(async_engine)
        auth_engine = db.create_sync_engine(
            settings.get_auth_database_url(),
            pool_timeout=5,
            connect_args={"connect_timeout": 5, "options": "-c statement_timeout=5000"},
        )
        _app.state.account_email_reader = SupabaseAccountEmailReader(auth_engine)
        _app.state.mail_sender = SmtpMailSender(
            enabled=settings.SMTP_ENABLED,
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=(
                settings.SMTP_PASSWORD.get_secret_value()
                if settings.SMTP_PASSWORD
                else None
            ),
            timeout=settings.SMTP_TIMEOUT_SECONDS,
        )
        yield
    finally:
        _app.state.account_email_reader = None
        _app.state.mail_sender = None
        db.sync_session_maker = None
        db.async_session_maker = None
        db.sync_engine = None
        db.async_engine = None
        try:
            if async_engine is not None:
                await async_engine.dispose()
        finally:
            try:
                sync_engine.dispose()
            finally:
                if auth_engine is not None:
                    auth_engine.dispose()


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
karlbruder_app.add_middleware(StructlogRequestMiddleware)
