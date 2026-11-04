"""AUTH-005–007: identity services work without HTTP transport."""

from uuid import uuid4

import pytest
from jwt.exceptions import PyJWKClientConnectionError

from app.auth import services
from app.auth.exceptions import AuthenticationUnavailableException
from app.auth.models import AnonymousUser, User


@pytest.mark.parametrize("role", ["regular_user", "guild_member", "admin"])
def test_application_role_uses_verified_app_metadata(role):
    user = User(id=uuid4(), app_metadata={"karlbruder_role": role})

    assert services.get_application_role(user) == role


@pytest.mark.parametrize("metadata", [{}, {"karlbruder_role": "unknown"}])
def test_application_role_defaults_to_regular_user_without_trusting_user_metadata(metadata):
    user = User(
        id=uuid4(),
        app_metadata=metadata,
        user_metadata={"karlbruder_role": "admin"},
    )

    assert services.get_application_role(user) == "regular_user"


def test_application_role_identifies_anonymous_visitors_as_guests():
    assert services.get_application_role(AnonymousUser()) == "guest"


def test_token_verification_reports_signing_key_outage_as_a_domain_error(monkeypatch):
    class OfflineJwksClient:
        def get_signing_key_from_jwt(self, _token):
            raise PyJWKClientConnectionError("offline")

    monkeypatch.setattr(services, "get_jwks_client", OfflineJwksClient)

    with pytest.raises(AuthenticationUnavailableException, match="Authentication service unavailable"):
        services.verify_user("access-token")
