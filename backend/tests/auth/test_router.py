from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Request
from fastapi.testclient import TestClient
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from app.auth.dependencies import get_current_user, require_authenticated_user
from app.auth.exceptions import InvalidCredentialsException
from app.auth.models import AnonymousUser
from app.auth.supabase import tokens
from app.auth.supabase.roles import get_application_role
from app.main import karlbruder_app
from config import settings

ISSUER = settings.issuer


class StaticJwksClient:
    def __init__(self, public_key):
        self.public_key = public_key

    def get_signing_key_from_jwt(self, _token: str):
        return SimpleNamespace(key=self.public_key)


class OfflineJwksClient:
    def get_signing_key_from_jwt(self, _token: str):
        raise PyJWKClientConnectionError("offline")


@pytest.fixture
def signing_key():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture
def rsa_signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def client(monkeypatch, signing_key):
    monkeypatch.setattr(
        tokens,
        "get_jwks_client",
        lambda: StaticJwksClient(signing_key.public_key()),
    )
    return TestClient(karlbruder_app)


def make_token(
    signing_key, *, algorithm: str = "ES256", **overrides
) -> tuple[str, dict]:
    now = datetime.now(UTC)
    claims = {
        "iss": ISSUER,
        "aud": "authenticated",
        "exp": now + timedelta(minutes=5),
        "iat": now,
        "sub": str(uuid4()),
        "role": "authenticated",
        "email": "member@example.com",
        "user_metadata": {"name": "Test Member"},
        "app_metadata": {"provider": "email"},
    }
    claims.update(overrides)
    token = jwt.encode(
        claims,
        signing_key,
        algorithm=algorithm,
        headers={"kid": f"{algorithm.lower()}-test-key"},
    )
    return token, claims


def test_get_current_user_returns_explicit_guest_without_credentials():
    request = Request({"type": "http", "headers": []})

    guest = get_current_user(request, None)

    assert isinstance(guest, AnonymousUser)
    assert (guest.id, guest.email, guest.role) == ("", "", "guest")
    assert get_application_role(guest) == "guest"
    with pytest.raises(InvalidCredentialsException):
        require_authenticated_user(guest)


def test_users_me_returns_verified_identity(client, signing_key):
    token, claims = make_token(signing_key)

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": claims["sub"],
        "email": "member@example.com",
        "user_metadata": {"name": "Test Member"},
        "app_metadata": {"provider": "email"},
    }


def test_users_me_rejects_missing_token(client):
    response = client.get("/api/users/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("authorization", ["Basic abc", "Bearer ", "NotBearer abc"])
def test_users_me_rejects_present_non_bearer_or_empty_credentials(client, authorization):
    response = client.get("/api/users/me", headers={"Authorization": authorization})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_users_me_rejects_malformed_token_before_jwks_fetch(monkeypatch):
    jwks_client = PyJWKClient("https://unused.example.test/jwks")
    monkeypatch.setattr(tokens, "get_jwks_client", lambda: jwks_client)

    response = TestClient(karlbruder_app).get(
        "/api/users/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_users_me_exposes_bearer_auth_in_openapi(client):
    schema = client.get("/api/openapi.json").json()

    security_schemes = schema["components"]["securitySchemes"]
    assert security_schemes["HTTPBearer"] == {
        "type": "http",
        "description": "Supabase access token",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }
    assert schema["paths"]["/api/users/me"]["get"]["security"] == [{"HTTPBearer": []}]


@pytest.mark.parametrize(
    ("claim", "value"),
    [
        ("iss", "https://another-project.supabase.co/auth/v1"),
        ("aud", "anon"),
        ("role", "service_role"),
        ("sub", "not-a-uuid"),
    ],
)
def test_users_me_rejects_untrusted_claims(client, signing_key, claim, value):
    token, _ = make_token(signing_key, **{claim: value})

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_users_me_rejects_expired_token(client, signing_key):
    token, _ = make_token(signing_key, exp=datetime.now(UTC) - timedelta(seconds=1))

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_users_me_rejects_token_signed_by_another_key(client):
    other_key = ec.generate_private_key(ec.SECP256R1())
    token, _ = make_token(other_key)

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_users_me_accepts_rs256_token_from_trusted_key(monkeypatch, rsa_signing_key):
    monkeypatch.setattr(
        tokens,
        "get_jwks_client",
        lambda: StaticJwksClient(rsa_signing_key.public_key()),
    )
    token, claims = make_token(rsa_signing_key, algorithm="RS256")

    response = TestClient(karlbruder_app).get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == claims["sub"]


def test_users_me_rejects_rs256_token_from_untrusted_key(monkeypatch, rsa_signing_key):
    untrusted_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    monkeypatch.setattr(
        tokens,
        "get_jwks_client",
        lambda: StaticJwksClient(rsa_signing_key.public_key()),
    )
    token, _ = make_token(untrusted_key, algorithm="RS256")

    response = TestClient(karlbruder_app).get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_users_me_reports_jwks_outage(monkeypatch, signing_key):
    monkeypatch.setattr(tokens, "get_jwks_client", lambda: OfflineJwksClient())
    token, _ = make_token(signing_key)

    response = TestClient(karlbruder_app).get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication service unavailable"}
