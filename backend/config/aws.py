from pydantic_settings import (
    AWSSecretsManagerSettingsSource,
    BaseSettings,
    PydanticBaseSettingsSource,
)

from .base import Settings
from .env import AWS_REGION, SECRET_NAME


class AwsSettings(Settings):
    """Settings for environments running on AWS.

    Existing environment variables win. The env file is next.
    Secrets Manager fills only the values that are still missing.
    """

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        if not SECRET_NAME:
            raise ValueError("SECRET_NAME must be set for AWS environments")
        aws_secrets_manager_settings = AWSSecretsManagerSettingsSource(
            settings_cls,
            SECRET_NAME,
            region_name=AWS_REGION,
            case_sensitive=False,
        )
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
            aws_secrets_manager_settings,
        )
