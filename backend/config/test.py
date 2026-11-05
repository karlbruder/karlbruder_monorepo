from pydantic import AnyHttpUrl
from pydantic_settings import SettingsConfigDict

from .base import Settings


class TestSettings(Settings):
    """Defaults for the isolated Compose test database. Environment variables still override them."""

    model_config = SettingsConfigDict(
        env_file=".env.test",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_HOST: str = "db"
    DB_NAME: str = "postgres"

    # This stack has no hosted Supabase. The auth health check uses the same database.
    AUTH_DB_USER: str = "postgres"
    AUTH_DB_PASSWORD: str = "postgres"
    AUTH_DB_HOST: str = "db"
    AUTH_DB_NAME: str = "postgres"

    SUPABASE_URL: AnyHttpUrl = "https://test-project.supabase.co"  # type: ignore[assignment]

    SUPABASE_SERVICE_ROLE_KEY: str = "test-only-service-role-key"

    S3_BUCKET_NAME: str = "kb-test-bucket"

    SMTP_ENABLED: bool = False
    APP_BASE_URL: AnyHttpUrl = "https://app.example.test"
