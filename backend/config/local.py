from .base import Settings


class LocalSettings(Settings):
    """Local Compose defaults. A host-run API should set DB_HOST to localhost."""

    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_HOST: str = "db"
    DB_NAME: str = "postgres"

    S3_BUCKET_NAME: str = "kb-local-bucket"
    S3_ENDPOINT_URL: str = "http://ministack:4566"
    S3_BROWSER_ENDPOINT_URL: str = "http://localhost:4566"
