from pydantic_settings import BaseSettings


class StorageSettings(BaseSettings):
    S3_BUCKET_NAME: str
    S3_ENDPOINT_URL: str | None = None
    S3_BROWSER_ENDPOINT_URL: str | None = None
