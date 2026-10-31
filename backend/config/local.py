from .base import Settings


class LocalSettings(Settings):
    """Local Compose defaults. A host-run API should set DB_HOST to localhost."""

    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_HOST: str = "db"
    DB_NAME: str = "postgres"
