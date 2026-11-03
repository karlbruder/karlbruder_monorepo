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

    def create_presigned_put_url(
        self,
        storage_key: str,
        *,
        content_type: str,
        expires_in: int,
    ) -> str:
        try:
            return self._s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._bucket_name,
                    "Key": storage_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
                HttpMethod="PUT",
            )
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to create upload URL") from error

    def create_presigned_get_url(self, storage_key: str, *, expires_in: int) -> str:
        try:
            return self._s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket_name, "Key": storage_key},
                ExpiresIn=expires_in,
                HttpMethod="GET",
            )
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to create download URL") from error

    def head_object(self, storage_key: str) -> tuple[int, str | None]:
        try:
            response = self._s3_client.head_object(
                Bucket=self._bucket_name,
                Key=storage_key,
            )
        except ClientError as error:
            error_code = error.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchKey", "NotFound"):
                raise FileStorageError("Object not found") from error
            raise FileStorageError("Failed to inspect object") from error
        except BotoCoreError as error:
            raise FileStorageError("Failed to inspect object") from error
        content_length = int(response["ContentLength"])
        content_type = response.get("ContentType")
        return content_length, content_type

    def read_object_bytes(self, storage_key: str, *, start: int, end: int) -> bytes:
        try:
            response = self._s3_client.get_object(
                Bucket=self._bucket_name,
                Key=storage_key,
                Range=f"bytes={start}-{end}",
            )
            return response["Body"].read()
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to read object") from error

    def copy_object(self, source_storage_key: str, destination_storage_key: str) -> None:
        try:
            self._s3_client.copy_object(
                Bucket=self._bucket_name,
                Key=destination_storage_key,
                CopySource={"Bucket": self._bucket_name, "Key": source_storage_key},
            )
        except (ClientError, BotoCoreError) as error:
            raise FileStorageError("Failed to copy object") from error

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
