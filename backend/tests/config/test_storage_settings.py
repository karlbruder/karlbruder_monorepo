"""Settings for S3-backed file storage."""

from config.base import Settings
from config.local import LocalSettings
from config.test import TestSettings as BackendTestSettings


def test_base_settings_require_s3_bucket_name():
    assert Settings.model_fields["S3_BUCKET_NAME"].is_required()


def test_base_settings_default_s3_endpoint_url_to_none():
    assert Settings.model_fields["S3_ENDPOINT_URL"].default is None
    assert Settings.model_fields["S3_BROWSER_ENDPOINT_URL"].default is None


def test_local_settings_default_file_storage_for_compose():
    assert LocalSettings.model_fields["S3_BUCKET_NAME"].default == "kb-local-bucket"
    assert LocalSettings.model_fields["S3_ENDPOINT_URL"].default == "http://ministack:4566"
    assert LocalSettings.model_fields["S3_BROWSER_ENDPOINT_URL"].default == "http://localhost:4566"


def test_test_settings_default_bucket_without_overriding_endpoint():
    assert BackendTestSettings.model_fields["S3_BUCKET_NAME"].default == "kb-test-bucket"
    assert BackendTestSettings.model_fields["S3_ENDPOINT_URL"].default is None
    assert BackendTestSettings.model_fields["S3_BROWSER_ENDPOINT_URL"].default is None
