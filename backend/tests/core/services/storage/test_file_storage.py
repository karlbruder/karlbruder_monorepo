"""Tests for the S3 file storage client."""

from io import BytesIO
from unittest.mock import MagicMock, patch
from urllib.parse import urlparse

import pytest
from botocore.exceptions import ClientError

from app.core.services.storage import FileStorage, FileStorageError, get_file_storage
from app.core.services.storage.client import build_s3_client
from config.base import Settings


def test_store_file_puts_the_object_in_the_configured_bucket():
    s3_client = MagicMock()
    storage = FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url="http://ministack:4566",
        s3_client=s3_client,
    )

    storage.store_file(
        storage_key="tournaments/1/signups/2/parental_term/uuid",
        body=b"pdf-bytes",
        content_type="application/pdf",
    )

    s3_client.put_object.assert_called_once_with(
        Bucket="kb-local-bucket",
        Key="tournaments/1/signups/2/parental_term/uuid",
        Body=b"pdf-bytes",
        ContentType="application/pdf",
    )


def test_read_file_returns_body_and_content_type():
    body_stream = BytesIO(b"stored-bytes")
    s3_client = MagicMock()
    s3_client.get_object.return_value = {
        "Body": body_stream,
        "ContentType": "image/png",
    }
    storage = FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url=None,
        s3_client=s3_client,
    )

    body, content_type = storage.read_file("proof-key")

    assert body == b"stored-bytes"
    assert content_type == "image/png"


def test_delete_file_removes_the_object():
    s3_client = MagicMock()
    storage = FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url=None,
        s3_client=s3_client,
    )

    storage.delete_file("proof-key")

    s3_client.delete_object.assert_called_once_with(
        Bucket="kb-local-bucket",
        Key="proof-key",
    )


def test_storage_methods_wrap_boto_errors_as_file_storage_error():
    s3_client = MagicMock()
    s3_client.put_object.side_effect = ClientError(
        {"Error": {"Code": "InternalError", "Message": "failed"}},
        "PutObject",
    )
    storage = FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url=None,
        s3_client=s3_client,
    )

    with pytest.raises(FileStorageError, match="Failed to store file"):
        storage.store_file("key", b"data", "text/plain")


def test_file_storage_creates_presigned_put_and_get_urls():
    s3_client = MagicMock()
    s3_client.generate_presigned_url.side_effect = ["put-url", "get-url"]
    storage = FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url=None,
        s3_client=s3_client,
    )

    put_url = storage.create_presigned_put_url(
        "staging/key",
        content_type="application/pdf",
        expires_in=900,
    )
    get_url = storage.create_presigned_get_url("final/key", expires_in=600)

    assert put_url == "put-url"
    assert get_url == "get-url"
    assert s3_client.generate_presigned_url.call_count == 2


@patch("app.core.services.storage.file_storage.build_s3_client")
def test_file_storage_delegates_client_creation_to_build_s3_client(build_s3_client):
    build_s3_client.return_value = MagicMock()
    FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url="http://ministack:4566",
    )

    build_s3_client.assert_called_once_with(endpoint_url="http://ministack:4566")


@patch("app.core.services.storage.client.boto3.client")
def test_build_s3_client_uses_path_style_addressing_for_a_local_endpoint(boto3_client):
    build_s3_client(endpoint_url="http://ministack:4566")

    _, kwargs = boto3_client.call_args
    assert kwargs["endpoint_url"] == "http://ministack:4566"
    assert kwargs["config"].s3["addressing_style"] == "path"


@patch("app.core.services.storage.client.boto3.client")
def test_build_s3_client_omits_endpoint_configuration_when_endpoint_is_none(boto3_client):
    build_s3_client(endpoint_url=None)

    boto3_client.assert_called_once_with("s3", region_name="us-east-2")


def test_presigned_url_uses_the_browser_endpoint_while_object_calls_stay_on_the_server(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    storage = FileStorage(
        bucket_name="kb-local-bucket",
        endpoint_url="http://ministack:4566",
        browser_endpoint_url="http://localhost:4566",
    )

    put_url = storage.create_presigned_put_url(
        "staging/key",
        content_type="application/pdf",
        expires_in=60,
    )
    get_url = storage.create_presigned_get_url("final/key", expires_in=60)

    assert urlparse(put_url).hostname in {"localhost", "127.0.0.1"}
    assert urlparse(get_url).hostname in {"localhost", "127.0.0.1"}
    assert storage._s3_client.meta.endpoint_url == "http://ministack:4566"
    assert "ministack" not in put_url
    assert "ministack" not in get_url


def test_presigned_urls_use_the_server_client_when_no_browser_endpoint_is_set():
    s3_client = MagicMock()
    s3_client.generate_presigned_url.return_value = "https://s3.amazonaws.com/kb-prod-bucket/key"
    storage = FileStorage(
        bucket_name="kb-prod-bucket",
        endpoint_url=None,
        s3_client=s3_client,
    )

    storage.create_presigned_put_url(
        "staging/key",
        content_type="application/pdf",
        expires_in=60,
    )

    s3_client.generate_presigned_url.assert_called_once()


def test_get_file_storage_passes_settings_to_the_client_builder(monkeypatch):
    monkeypatch.setattr(
        "app.core.services.storage.file_storage.settings",
        Settings(
            DB_USER="postgres",
            DB_PASSWORD="postgres",
            DB_HOST="db",
            DB_NAME="postgres",
            AUTH_DB_USER="auth",
            AUTH_DB_PASSWORD="auth",
            AUTH_DB_HOST="auth-db",
            AUTH_DB_NAME="auth",
            SUPABASE_URL="https://example.supabase.co",
            S3_BUCKET_NAME="kb-local-bucket",
            S3_ENDPOINT_URL="http://ministack:4566",
        ),
    )

    with patch("app.core.services.storage.file_storage.build_s3_client") as build_s3_client:
        build_s3_client.return_value = MagicMock()
        get_file_storage()

    build_s3_client.assert_called_once_with(endpoint_url="http://ministack:4566")


@patch("app.core.services.storage.file_storage.build_s3_client")
def test_get_file_storage_signs_browser_urls_with_the_browser_endpoint(build_s3_client, monkeypatch):
    monkeypatch.setattr(
        "app.core.services.storage.file_storage.settings",
        Settings(
            DB_USER="postgres",
            DB_PASSWORD="postgres",
            DB_HOST="db",
            DB_NAME="postgres",
            AUTH_DB_USER="auth",
            AUTH_DB_PASSWORD="auth",
            AUTH_DB_HOST="auth-db",
            AUTH_DB_NAME="auth",
            SUPABASE_URL="https://example.supabase.co",
            S3_BUCKET_NAME="kb-local-bucket",
            S3_ENDPOINT_URL="http://ministack:4566",
            S3_BROWSER_ENDPOINT_URL="http://localhost:4566",
        ),
    )
    build_s3_client.return_value = MagicMock()

    get_file_storage()

    assert [call.kwargs for call in build_s3_client.call_args_list] == [
        {"endpoint_url": "http://ministack:4566"},
        {"endpoint_url": "http://localhost:4566"},
    ]
