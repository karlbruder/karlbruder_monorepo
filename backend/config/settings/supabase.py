from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings


class SupabaseSettings(BaseSettings):
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
