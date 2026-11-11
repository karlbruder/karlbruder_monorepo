from .base import (
    ALLOWED_JWT_ALGORITHMS,
    EXPECTED_AUDIENCE,
    EXPECTED_ROLE,
    JWKS_CACHE_LIFESPAN_SECONDS,
    JWKS_REQUEST_TIMEOUT_SECONDS,
)
from .env import ENV_NAME
from .sentry import setup_sentry

match ENV_NAME:
    case "local":
        from .local import LocalSettings

        settings = LocalSettings()  # type: ignore[call-arg]
    case "test":
        from .test import TestSettings

        settings = TestSettings()
    case _:
        from .aws import AwsSettings

        settings = AwsSettings()  # type: ignore[call-arg]

setup_sentry(settings)

__all__ = [
    "ALLOWED_JWT_ALGORITHMS",
    "EXPECTED_AUDIENCE",
    "EXPECTED_ROLE",
    "JWKS_CACHE_LIFESPAN_SECONDS",
    "JWKS_REQUEST_TIMEOUT_SECONDS",
    "settings",
]
