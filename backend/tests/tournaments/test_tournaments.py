"""Tournament catalog authorization and configuration contracts."""

import os
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from jwt.exceptions import PyJWKClientConnectionError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

import auth  # noqa: E402
from database import Base, get_session  # noqa: E402
from main import karlbruder_app  # noqa: E402


class StaticJwksClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, _token):
        return SimpleNamespace(key=self.key)


class OfflineJwksClient:
    def get_signing_key_from_jwt(self, _token):
        raise PyJWKClientConnectionError("offline")


@pytest.fixture
def client(monkeypatch):
    signing_key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        auth, "get_jwks_client", lambda: StaticJwksClient(signing_key.public_key())
    )
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as connection:
        connection.execute(text("ATTACH DATABASE ':memory:' AS public"))
    Base.metadata.create_all(engine)

    def test_session():
        with Session(engine) as session:
            yield session

    karlbruder_app.dependency_overrides[get_session] = test_session
    try:
        with TestClient(karlbruder_app) as test_client:
            yield test_client, signing_key
    finally:
        karlbruder_app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


def _headers(signing_key, role=None, *, user_metadata=None):
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "iss": f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1",
            "aud": "authenticated",
            "exp": now + timedelta(minutes=5),
            "iat": now,
            "sub": str(uuid4()),
            "role": "authenticated",
            "email": "fixture@example.test",
            "user_metadata": user_metadata or {},
            "app_metadata": {"karlbruder_role": role} if role is not None else {},
        },
        signing_key,
        algorithm="ES256",
        headers={"kid": "fixture-key"},
    )
    return {"Authorization": f"Bearer {token}"}


def _event(name="Fixture Tournament", *, internal=False, **overrides):
    return {
        "name": name,
        "starts_at": "2027-01-17T12:00:00Z",
        "is_internal": internal,
        "modality": "longsword",
        **overrides,
    }


def test_admin_creates_two_generic_tournaments_and_public_reads_are_scoped(client):
    test_client, key = client
    admin = _headers(key, "admin")
    first = test_client.post(
        "/api/tournaments", json=_event("Monomachia Fixture"), headers=admin
    )
    second = test_client.post(
        "/api/tournaments",
        json=_event("Second Fixture", inscription_fee_amount="75.00", modality="sabre"),
        headers=admin,
    )
    assert first.status_code == second.status_code == 201
    first_data, second_data = first.json(), second.json()
    assert first_data["id"] != second_data["id"]
    assert first_data["name"] == "Monomachia Fixture"
    assert first_data["slug"] is None
    assert first_data["inscription_fee_amount"] is None
    assert second_data["inscription_fee_amount"] == "75.00"
    assert second_data["modality"] == "sabre"
    assert "next_inscription_serial" not in first_data
    assert "signups" not in first_data

    listing = test_client.get("/api/tournaments")
    assert listing.status_code == 200
    assert {event["id"] for event in listing.json()} == {
        first_data["id"],
        second_data["id"],
    }
    detail = test_client.get(f"/api/tournaments/{first_data['id']}")
    assert detail.status_code == 200
    assert detail.json()["name"] == first_data["name"]
    assert detail.json()["slug"] is None
    assert detail.json()["inscription_fee_amount"] is None


def test_internal_event_is_hidden_from_guest_and_regular_user(client):
    test_client, key = client
    admin = _headers(key, "admin")
    public_id = test_client.post(
        "/api/tournaments", json=_event("Public Fixture", slug="public-fixture"), headers=admin
    ).json()["id"]
    internal_id = test_client.post(
        "/api/tournaments",
        json=_event("Internal Fixture", internal=True, slug="internal-fixture"),
        headers=admin,
    ).json()["id"]

    for headers in ({}, _headers(key, "regular_user"), _headers(key)):
        listing = test_client.get("/api/tournaments", headers=headers)
        assert listing.status_code == 200
        assert [item["id"] for item in listing.json()] == [public_id]
        assert test_client.get(
            f"/api/tournaments/{internal_id}", headers=headers
        ).status_code == 404
        assert test_client.get(
            "/api/tournaments?slug=internal-fixture", headers=headers
        ).json() == []

    for role in ("guild_member", "admin"):
        headers = _headers(key, role)
        listing = test_client.get("/api/tournaments", headers=headers)
        assert {item["id"] for item in listing.json()} == {public_id, internal_id}
        assert test_client.get(
            f"/api/tournaments/{internal_id}", headers=headers
        ).status_code == 200
        assert [event["id"] for event in test_client.get(
            "/api/tournaments?slug=internal-fixture", headers=headers
        ).json()] == [internal_id]


def test_slug_filter_is_exact_and_duplicate_create_is_a_conflict(client):
    test_client, key = client
    admin = _headers(key, "admin")
    first = test_client.post(
        "/api/tournaments",
        json=_event("Monomachia Fixture", slug="monomachia-2027"),
        headers=admin,
    )
    second = test_client.post(
        "/api/tournaments",
        json=_event("Other Fixture", slug="other-2027"),
        headers=admin,
    )
    assert first.status_code == second.status_code == 201
    assert first.json()["slug"] == "monomachia-2027"
    assert [item["id"] for item in test_client.get(
        "/api/tournaments?slug=monomachia-2027"
    ).json()] == [first.json()["id"]]
    assert test_client.get("/api/tournaments?slug=monomachia").json() == []
    assert len(test_client.get("/api/tournaments").json()) == 2

    duplicate = test_client.post(
        "/api/tournaments",
        json=_event("Another Fixture", slug="monomachia-2027"),
        headers=admin,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Tournament slug already exists"
    assert len(test_client.get("/api/tournaments").json()) == 2


@pytest.mark.parametrize("slug", ["", "Monomachia-2027", "monomachia_2027", "-mono", "mono-", "mono--2027", "a" * 101])
def test_invalid_slug_is_rejected_on_create_and_filter(client, slug):
    test_client, key = client
    admin = _headers(key, "admin")
    assert test_client.post(
        "/api/tournaments", json=_event(slug=slug), headers=admin
    ).status_code == 422
    assert test_client.get("/api/tournaments", params={"slug": slug}).status_code == 422
    assert test_client.get("/api/tournaments").json() == []


def test_only_trusted_admin_claim_can_create(client):
    test_client, key = client
    forged_profile = _headers(
        key, "regular_user", user_metadata={"karlbruder_role": "admin"}
    )
    for headers, expected in (
        ({}, 401),
        (_headers(key, "regular_user"), 403),
        (_headers(key, "guild_member"), 403),
        (_headers(key, "unknown"), 403),
        (forged_profile, 403),
    ):
        assert test_client.post(
            "/api/tournaments", json=_event(), headers=headers
        ).status_code == expected
    assert test_client.get("/api/tournaments").json() == []


def test_invalid_supplied_bearer_token_fails_even_on_public_read(client):
    test_client, _ = client
    for authorization in ("Bearer not-a-jwt", "Basic malformed", "Bearer "):
        headers = {"Authorization": authorization}
        assert test_client.get("/api/tournaments", headers=headers).status_code == 401
        assert test_client.get("/api/tournaments/1", headers=headers).status_code == 401


def test_guest_catalog_does_not_fetch_jwks_and_supplied_token_outage_is_503(
    client, monkeypatch
):
    test_client, key = client
    monkeypatch.setattr(auth, "get_jwks_client", lambda: OfflineJwksClient())

    assert test_client.get("/api/tournaments").status_code == 200
    assert test_client.get("/api/tournaments/1").status_code == 404

    headers = _headers(key, "regular_user")
    assert test_client.get("/api/tournaments", headers=headers).status_code == 503
    assert test_client.get("/api/tournaments/1", headers=headers).status_code == 503


@pytest.mark.parametrize(
    "changes",
    [
        {"name": "   "},
        {"starts_at": "2027-01-17T12:00:00"},
        {"ends_at": "2027-01-16T12:00:00Z"},
        {"registration_opens_on": "2027-02-01", "registration_closes_on": "2027-01-01"},
        {"max_competitor_capacity": -1},
        {"inscription_fee_amount": "-0.01"},
        {"inscription_fee_amount": "1.001"},
        {"id": 999},
        {"next_inscription_serial": 500},
    ],
)
def test_admin_create_rejects_invalid_configuration(client, changes):
    test_client, key = client
    response = test_client.post(
        "/api/tournaments", json=_event(**changes), headers=_headers(key, "admin")
    )
    assert response.status_code == 422
    assert test_client.get("/api/tournaments").json() == []


def test_unknown_event_returns_404_for_all_viewers(client):
    test_client, key = client
    assert test_client.get("/api/tournaments/404").status_code == 404
    assert test_client.get(
        "/api/tournaments/404", headers=_headers(key, "admin")
    ).status_code == 404


def test_catalog_routes_have_explicit_response_contracts(client):
    test_client, _ = client
    schema = test_client.get("/openapi.json").json()
    assert "/api/tournaments" in schema["paths"]
    assert "/api/tournaments/{tournament_id}" in schema["paths"]
    assert "201" in schema["paths"]["/api/tournaments"]["post"]["responses"]
    assert "200" in schema["paths"]["/api/tournaments"]["get"]["responses"]
    assert "slug" in {
        parameter["name"]
        for parameter in schema["paths"]["/api/tournaments"]["get"]["parameters"]
    }
