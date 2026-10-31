from typing import Final

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

from .env import (
    APP_NAME,
    CONTAINER_NAME,
    ENV_NAME,
    GIT_SHA,
    IS_LOCAL_ENV,
    RELEASED_AT,
    VERSION,
)

EXPECTED_AUDIENCE: Final = "authenticated"
EXPECTED_ROLE: Final = "authenticated"
ALLOWED_JWT_ALGORITHMS: Final = ("ES256", "RS256")
JWKS_CACHE_LIFESPAN_SECONDS: Final = 300
JWKS_REQUEST_TIMEOUT_SECONDS: Final = 5


class Settings(BaseSettings):
    """Shared settings. Environment variables override the env file. AWS environments fill the rest from Secrets Manager."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENV_NAME: str = ENV_NAME
    APP_NAME: str = APP_NAME
    CONTAINER_NAME: str = CONTAINER_NAME

    VERSION: str = VERSION
    GIT_SHA: str = GIT_SHA
    RELEASED_AT: str = RELEASED_AT

    DB_ENGINE: str = "postgresql"
    DB_DRIVER: str = "psycopg"
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str

    AUTH_DB_USER: str
    AUTH_DB_PASSWORD: str
    AUTH_DB_HOST: str
    AUTH_DB_PORT: int = 5432
    AUTH_DB_NAME: str

    SUPABASE_URL: AnyHttpUrl

    @field_validator("SUPABASE_URL")
    @classmethod
    def require_secure_project_root(cls, value: AnyHttpUrl) -> AnyHttpUrl:
        if value.scheme != "https":
            raise ValueError("SUPABASE_URL must use HTTPS")
        if value.username is not None or value.password is not None:
            raise ValueError("SUPABASE_URL must not contain credentials")
        if value.path not in (None, "", "/") or value.query or value.fragment:
            raise ValueError("SUPABASE_URL must be the project root URL")
        return value

    def is_local_environment(self) -> bool:
        return IS_LOCAL_ENV

    @property
    def issuer(self) -> str:
        return f"{str(self.SUPABASE_URL).rstrip('/')}/auth/v1"

    @property
    def jwks_url(self) -> str:
        return f"{self.issuer}/.well-known/jwks.json"

    def get_database_url(self) -> str:
        """Build the domain database URL from host, name, user, and password."""
        return self._build_database_url(
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
        )

    def get_auth_database_url(self) -> str:
        """Build the Auth database URL used by the Auth health check."""
        return self._build_database_url(
            username=self.AUTH_DB_USER,
            password=self.AUTH_DB_PASSWORD,
            host=self.AUTH_DB_HOST,
            port=self.AUTH_DB_PORT,
            database=self.AUTH_DB_NAME,
        )

    def _build_database_url(
        self,
        username: str,
        password: str,
        host: str,
        port: int,
        database: str,
    ) -> str:
        return URL.create(
            drivername=f"{self.DB_ENGINE}+{self.DB_DRIVER}",
            username=username,
            password=password,
            host=host,
            port=port,
            database=database,
        ).render_as_string(hide_password=False)
