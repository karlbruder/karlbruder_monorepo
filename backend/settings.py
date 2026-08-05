from typing import Final

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

EXPECTED_AUDIENCE: Final = "authenticated"
EXPECTED_ROLE: Final = "authenticated"
ALLOWED_JWT_ALGORITHMS: Final = ("ES256", "RS256")
JWKS_CACHE_LIFESPAN_SECONDS: Final = 300
JWKS_REQUEST_TIMEOUT_SECONDS: Final = 5


class AuthSettings(BaseSettings):
    """Environment-backed configuration for Supabase token verification."""

    model_config = SettingsConfigDict(extra="ignore")

    supabase_url: AnyHttpUrl

    @field_validator("supabase_url")
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
        return f"{str(self.supabase_url).rstrip('/')}/auth/v1"

    @property
    def jwks_url(self) -> str:
        return f"{self.issuer}/.well-known/jwks.json"


def get_auth_settings() -> AuthSettings:
    return AuthSettings()  # type: ignore[call-arg]
