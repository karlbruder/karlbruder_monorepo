from typing import Self

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings

from app.core.mail import validate_sender_address


class EmailSettings(BaseSettings):
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
    def require_enabled_mail_configuration(self) -> Self:
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
