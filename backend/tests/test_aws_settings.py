"""Cloud settings require a secret name and a region before they read Secrets Manager."""

from types import SimpleNamespace

import pytest

from config.aws import AwsSettings


class RecordingSecretsSource:
    def __init__(self, settings_cls, secret_name, region_name, case_sensitive):
        self.settings_cls = settings_cls
        self.secret_name = secret_name
        self.region_name = region_name
        self.case_sensitive = case_sensitive


def test_cloud_settings_reject_a_missing_secret_name(monkeypatch):
    monkeypatch.setattr("config.aws.SECRET_NAME", None)
    monkeypatch.setattr("config.aws.AWS_REGION", "us-east-2")

    with pytest.raises(ValueError, match="SECRET_NAME must be set for AWS environments"):
        AwsSettings.settings_customise_sources(
            AwsSettings,
            SimpleNamespace(name="init"),
            SimpleNamespace(name="env"),
            SimpleNamespace(name="dotenv"),
            SimpleNamespace(name="file"),
        )


def test_cloud_settings_read_secrets_manager_when_secret_name_and_region_are_set(
    monkeypatch,
):
    monkeypatch.setattr("config.aws.SECRET_NAME", "kb-dev/backend")
    monkeypatch.setattr("config.aws.AWS_REGION", "us-east-2")
    monkeypatch.setattr("config.aws.AWSSecretsManagerSettingsSource", RecordingSecretsSource)

    sources = AwsSettings.settings_customise_sources(
        AwsSettings,
        SimpleNamespace(name="init"),
        SimpleNamespace(name="env"),
        SimpleNamespace(name="dotenv"),
        SimpleNamespace(name="file"),
    )

    assert isinstance(sources[-1], RecordingSecretsSource)
    assert sources[-1].secret_name == "kb-dev/backend"
    assert sources[-1].region_name == "us-east-2"


def test_cloud_settings_reject_a_secret_name_without_a_region(monkeypatch):
    monkeypatch.setattr("config.aws.SECRET_NAME", "kb-dev/backend")
    monkeypatch.setattr("config.aws.AWS_REGION", None)

    with pytest.raises(ValueError, match="AWS_REGION must be set for AWS environments"):
        AwsSettings.settings_customise_sources(
            AwsSettings,
            SimpleNamespace(name="init"),
            SimpleNamespace(name="env"),
            SimpleNamespace(name="dotenv"),
            SimpleNamespace(name="file"),
        )
