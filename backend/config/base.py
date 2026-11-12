from typing import Final

from pydantic_settings import SettingsConfigDict

from .env import (
    APP_NAME,
    CONTAINER_NAME,
    ENV_NAME,
    GIT_SHA,
    IS_LOCAL_ENV,
    RELEASED_AT,
    VERSION,
)
from .settings.database import DatabaseSettings
from .settings.email import EmailSettings
from .settings.logging import LoggingSettings
from .settings.sentry import SentrySettings
from .settings.storage import StorageSettings
from .settings.supabase import SupabaseSettings

EXPECTED_AUDIENCE: Final = "authenticated"
EXPECTED_ROLE: Final = "authenticated"
ALLOWED_JWT_ALGORITHMS: Final = ("ES256", "RS256")
JWKS_CACHE_LIFESPAN_SECONDS: Final = 300
JWKS_REQUEST_TIMEOUT_SECONDS: Final = 5


class Settings(
    DatabaseSettings,
    SupabaseSettings,
    EmailSettings,
    StorageSettings,
    SentrySettings,
    LoggingSettings,
):
    """Shared settings. Environment variables override the env file. AWS environments fill the rest from Secrets Manager."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    ENV_NAME: str = ENV_NAME
    APP_NAME: str = APP_NAME
    CONTAINER_NAME: str = CONTAINER_NAME

    # Health
    HEALTH_CHECK_PATH: str = "/api/health"
    HEALTH_DB_CHECK_PATH: str = "/api/health/db"
    HEALTH_AUTH_CHECK_PATH: str = "/api/health/auth"

    # Versioning
    VERSION: str = VERSION
    GIT_SHA: str = GIT_SHA
    RELEASED_AT: str = RELEASED_AT

    def is_local_environment(self) -> bool:
        return IS_LOCAL_ENV
