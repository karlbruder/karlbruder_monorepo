from typing import Final

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

from app.core.mail import validate_sender_address

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

    # Application
    ENV_NAME: str = ENV_NAME
    APP_NAME: str = APP_NAME
    CONTAINER_NAME: str = CONTAINER_NAME

    # Versioning
    VERSION: str = VERSION
    GIT_SHA: str = GIT_SHA
    RELEASED_AT: str = RELEASED_AT

    def is_local_environment(self) -> bool:
        return IS_LOCAL_ENV

    # Domain database
    DB_ENGINE: str = "postgresql"
    DB_DRIVER: str = "psycopg"
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str

    # Auth database
    AUTH_DB_USER: str
    AUTH_DB_PASSWORD: str
    AUTH_DB_HOST: str
    AUTH_DB_PORT: int = 5432
    AUTH_DB_NAME: str

    # Supabase
    SUPABASE_URL: AnyHttpUrl
    SUPABASE_SERVICE_ROLE_KEY: str

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
        """Build the Auth database URL for diagnostics and current-email lookup."""
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

    # Email
    SMTP_FROM: str = "Suporte Karlbrüder <no-reply@karlbruder.com.br>"
    SMTP_ENABLED: bool = False
    SMTP_HOST: str | None = None
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: SecretStr | None = None
    SMTP_TIMEOUT_SECONDS: float = Field(default=5, gt=0, le=30, allow_inf_nan=False)
    APP_BASE_URL: AnyHttpUrl | None = None

    @field_validator("SMTP_FROM")
    @classmethod
    def require_sender_address(cls, value: str) -> str:
        return validate_sender_address(value)

    @field_validator("APP_BASE_URL")
    @classmethod
    def require_application_origin(cls, value: AnyHttpUrl | None) -> AnyHttpUrl | None:
        if value is None:
            return value
        if (
            value.username is not None
            or value.password is not None
            or value.path not in (None, "", "/")
            or value.query
            or value.fragment
        ):
            raise ValueError(
                "APP_BASE_URL must be an HTTP(S) origin without credentials"
            )
        return value

    @model_validator(mode="after")
    def require_enabled_mail_configuration(self) -> "Settings":
        if self.SMTP_ENABLED:
            if not all(
                (
                    self.SMTP_HOST,
                    self.SMTP_USERNAME,
                    self.SMTP_PASSWORD,
                    self.APP_BASE_URL,
                )
            ):
                raise ValueError(
                    "Enabled SMTP requires host, username, password and APP_BASE_URL"
                )
            if not self.SMTP_HOST.strip() or not self.SMTP_USERNAME.strip():
                raise ValueError("SMTP host and username must not be blank")
            if not self.SMTP_PASSWORD.get_secret_value().strip():
                raise ValueError("SMTP password must not be blank")
            if self.SMTP_PORT == 465:
                raise ValueError(
                    "SMTP uses STARTTLS, select a STARTTLS port such as 587"
                )
        return self

    # S3 File storage
    S3_BUCKET_NAME: str
    S3_ENDPOINT_URL: str | None = None
    S3_BROWSER_ENDPOINT_URL: str | None = None

    # Monitoring
    SENTRY_DSN: str = Field(min_length=1)
    SENTRY_ENABLED: bool = False
    SENTRY_SUCCESS_TRANSACTION_SAMPLE_RATE: float = Field(
        default=0.1, ge=0, le=1, allow_inf_nan=False
    )
    SENTRY_LOG_LEVEL: str = "INFO"

    @field_validator("SENTRY_LOG_LEVEL")
    @classmethod
    def validate_sentry_log_level(cls, value: str) -> str:
        value = value.upper()
        if value not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError("SENTRY_LOG_LEVEL must be a standard logging level")
        return value
