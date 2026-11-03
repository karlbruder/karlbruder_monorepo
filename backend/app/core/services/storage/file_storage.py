"""S3-backed file storage."""

from typing import BinaryIO

from botocore.exceptions import BotoCoreError, ClientError

from config import settings

from .client import build_s3_client
from .exceptions import FileStorageError


class FileStorage:
    def __init__(
        self,
        bucket_name: str,
        endpoint_url: str | None,
        s3_client=None,
    ) -> None:
        self._bucket_name = bucket_name
        self._s3_client = s3_client or build_s3_client(endpoint_url=endpoint_url)

    def store_file(
        self,
        storage_key: str,
        body: bytes | BinaryIO,
        content_type: str,
    ) -> None:
        try:
            self._s3_client.put_object(
                Bucket=self._bucket_name,
                Key=storage_key,
                Body=body,
                ContentType=content_type,
            )
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to store file") from error

    def read_file(self, storage_key: str) -> tuple[bytes, str]:
        try:
            response = self._s3_client.get_object(
                Bucket=self._bucket_name,
                Key=storage_key,
            )
            content_type = response.get("ContentType") or "application/octet-stream"
            body = response["Body"].read()
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to read file") from error
        return body, content_type

    def delete_file(self, storage_key: str) -> None:
        try:
            self._s3_client.delete_object(
                Bucket=self._bucket_name,
                Key=storage_key,
            )
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to delete file") from error


def get_file_storage() -> FileStorage:
    return FileStorage(
        bucket_name=settings.S3_BUCKET_NAME,
        endpoint_url=settings.S3_ENDPOINT_URL,
    )
