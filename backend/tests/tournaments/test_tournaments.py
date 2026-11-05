"""Tournament catalog authorization and configuration contracts."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from jwt.exceptions import PyJWKClientConnectionError

from app.auth.supabase import tokens
from app.main import karlbruder_app
from config import settings


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
    from app.core.files import get_file_storage
    from app.tournaments.services.policy_fetch import get_policy_fetcher, FetchedPolicy
    from unittest.mock import Mock

    storage = Mock()
    storage.create_presigned_get_url.side_effect = (
        lambda key, **kwargs: f"https://archive.example.test/{key}"
    )
    fetcher = Mock()
    fetcher.fetch.side_effect = lambda url: FetchedPolicy(
        b"%PDF-1.4 fixture", "application/pdf", url
    )
    karlbruder_app.dependency_overrides[get_file_storage] = lambda: storage
    karlbruder_app.dependency_overrides[get_policy_fetcher] = lambda: fetcher
    signing_key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        tokens, "get_jwks_client", lambda: StaticJwksClient(signing_key.public_key())
    )
    with TestClient(karlbruder_app) as test_client:
        yield test_client, signing_key
    karlbruder_app.dependency_overrides.pop(get_file_storage, None)
    karlbruder_app.dependency_overrides.pop(get_policy_fetcher, None)


def _headers(signing_key, role=None, *, user_metadata=None):
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "iss": settings.issuer,
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


_slug_serial = 0


def _event(name="Fixture Tournament", *, internal=False, **overrides):
    global _slug_serial
    _slug_serial += 1
    return {
        "name": name,
        "slug": f"fixture-{_slug_serial}",
        "starts_at": "2027-01-17T12:00:00Z",
        "is_internal": internal,
        "discipline": "longsword",
        **overrides,
    }


def test_admin_creates_two_generic_tournaments_and_public_reads_are_scoped(client):
    """An admin can create more than one tournament, and the public catalog returns each one with its own fee and discipline.

    Registration rows and the next inscription serial stay out of that response.
    """
    test_client, key = client
    admin = _headers(key, "admin")
    first = test_client.post(
        "/api/staff/tournaments", json=_event("Monomachia Fixture"), headers=admin
    )
    second = test_client.post(
        "/api/staff/tournaments",
        json=_event(
            "Second Fixture", registration_fee_amount="75.00", discipline="sabre"
        ),
        headers=admin,
    )
    assert first.status_code == second.status_code == 201
    first_data, second_data = first.json(), second.json()
    assert first_data["id"] != second_data["id"]
    assert first_data["name"] == "Monomachia Fixture"
    assert first_data["slug"].startswith("fixture-")
    assert first_data["registration_fee_amount"] is None
    assert second_data["registration_fee_amount"] == "75.00"
    assert second_data["discipline"] == "sabre"
    assert "next_registration_number" not in first_data
    assert "registrations" not in first_data

    listing = test_client.get("/api/tournaments")
    assert listing.status_code == 200
    assert {event["id"] for event in listing.json()["items"]} == {
        first_data["id"],
        second_data["id"],
    }
    detail = test_client.get(f"/api/tournaments/{first_data['id']}")
    assert detail.status_code == 200
    assert detail.json()["name"] == first_data["name"]
    assert detail.json()["slug"] == first_data["slug"]
    assert detail.json()["registration_fee_amount"] is None


def test_internal_event_is_hidden_from_guest_and_regular_user(client):
    """Guests and regular users see only public events. Guild members and admins also see internal ones."""
    test_client, key = client
    admin = _headers(key, "admin")
    public_id = test_client.post(
        "/api/staff/tournaments",
        json=_event("Public Fixture", slug="public-fixture"),
        headers=admin,
    ).json()["id"]
    internal_id = test_client.post(
        "/api/staff/tournaments",
        json=_event("Internal Fixture", internal=True, slug="internal-fixture"),
        headers=admin,
    ).json()["id"]

    for headers in ({}, _headers(key, "regular_user"), _headers(key)):
        listing = test_client.get("/api/tournaments", headers=headers)
        assert listing.status_code == 200
        assert [item["id"] for item in listing.json()["items"]] == [public_id]
        assert (
            test_client.get(
                f"/api/tournaments/{internal_id}", headers=headers
            ).status_code
            == 404
        )
        assert (
            test_client.get(
                "/api/tournaments", params={"name": "Internal Fixture"}, headers=headers
            ).json()["items"]
            == []
        )

    for role in ("guild_member", "admin"):
        headers = _headers(key, role)
        listing = test_client.get("/api/tournaments", headers=headers)
        assert {item["id"] for item in listing.json()["items"]} == {
            public_id,
            internal_id,
        }
        assert (
            test_client.get(
                f"/api/tournaments/{internal_id}", headers=headers
            ).status_code
            == 200
        )
        assert [
            event["id"]
            for event in test_client.get(
                "/api/tournaments", params={"name": "Internal Fixture"}, headers=headers
            ).json()["items"]
        ] == [internal_id]


def test_list_filters_by_name_and_event_dates_and_duplicate_slug_conflicts(client):
    test_client, key = client
    admin = _headers(key, "admin")
    first = test_client.post(
        "/api/staff/tournaments",
        json=_event("Monomachia Fixture", slug="monomachia-2027"),
        headers=admin,
    )
    second = test_client.post(
        "/api/staff/tournaments",
        json=_event(
            "Other Fixture", slug="other-2028", starts_at="2028-03-02T12:00:00Z"
        ),
        headers=admin,
    )
    assert first.status_code == second.status_code == 201
    assert first.json()["slug"] == "monomachia-2027"
    by_name = test_client.get("/api/tournaments", params={"name": "monomachia"})
    assert [item["id"] for item in by_name.json()["items"]] == [first.json()["id"]]
    assert by_name.json()["total"] == 1
    by_date = test_client.get(
        "/api/tournaments",
        params={"starts_from": "2028-03-01", "starts_to": "2028-03-02"},
    )
    assert [item["id"] for item in by_date.json()["items"]] == [second.json()["id"]]
    page = test_client.get("/api/tournaments", params={"limit": 1, "offset": 0})
    assert page.json()["total"] == 2
    assert len(page.json()["items"]) == 1
    assert (
        test_client.get(
            "/api/tournaments",
            params={"starts_from": "2028-02-01", "starts_to": "2028-01-01"},
        ).status_code
        == 422
    )

    duplicate = test_client.post(
        "/api/staff/tournaments",
        json=_event("Another Fixture", slug="monomachia-2027"),
        headers=admin,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Tournament slug already exists"
    assert test_client.get("/api/tournaments").json()["total"] == 2


@pytest.mark.parametrize(
    "slug",
    ["Monomachia-2027", "monomachia_2027", "-mono", "mono-", "mono--2027", "a" * 101],
)
def test_invalid_slug_is_rejected_on_create(client, slug):
    test_client, key = client
    admin = _headers(key, "admin")
    assert (
        test_client.post(
            "/api/staff/tournaments", json=_event(slug=slug), headers=admin
        ).status_code
        == 422
    )
    assert test_client.get("/api/tournaments").json()["items"] == []


def test_missing_or_blank_slug_uses_name_discipline_and_event_year(client):
    test_client, key = client
    admin = _headers(key, "admin")
    omitted = _event("Monomachia", discipline="longsword")
    del omitted["slug"]
    blank = _event("Monomachia", discipline=None, slug="  ")
    created = test_client.post("/api/staff/tournaments", json=omitted, headers=admin)
    blank_created = test_client.post("/api/staff/tournaments", json=blank, headers=admin)
    assert created.status_code == blank_created.status_code == 201
    assert created.json()["slug"] == "monomachia-longsword-2027"
    assert blank_created.json()["slug"] == "monomachia-2027"


def test_only_trusted_admin_claim_can_create(client):
    """Only the admin role in app_metadata can create a tournament. The same role in user_metadata is ignored."""
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
        assert (
            test_client.post(
                "/api/staff/tournaments", json=_event(), headers=headers
            ).status_code
            == expected
        )
    assert test_client.get("/api/tournaments").json()["items"] == []


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
    monkeypatch.setattr(tokens, "get_jwks_client", lambda: OfflineJwksClient())

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
        {"competitor_capacity": -1},
        {"registration_fee_amount": "-0.01"},
        {"registration_fee_amount": "1.001"},
        {"id": 999},
        {"next_registration_number": 500},
    ],
)
def test_admin_create_rejects_invalid_configuration(client, changes):
    test_client, key = client
    response = test_client.post(
        "/api/staff/tournaments", json=_event(**changes), headers=_headers(key, "admin")
    )
    assert response.status_code == 422
    assert test_client.get("/api/tournaments").json()["items"] == []


def test_unknown_event_returns_404_for_all_viewers(client):
    test_client, key = client
    assert test_client.get("/api/tournaments/404").status_code == 404
    assert (
        test_client.get(
            "/api/tournaments/404", headers=_headers(key, "admin")
        ).status_code
        == 404
    )


def test_pix_key_can_be_set_on_create_but_never_appears_in_catalog_reads(client):
    test_client, key = client
    admin = _headers(key, "admin")
    created = test_client.post(
        "/api/staff/tournaments",
        json=_event(
            "Pix Fixture",
            pix_key="EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY",
        ),
        headers=admin,
    )
    assert created.status_code == 201
    event_id = created.json()["id"]
    assert "pix_key" not in created.json()

    listing = test_client.get("/api/tournaments").json()["items"]
    listed = next(item for item in listing if item["id"] == event_id)
    assert "pix_key" not in listed

    detail = test_client.get(f"/api/tournaments/{event_id}").json()
    assert "pix_key" not in detail


def test_catalog_routes_have_explicit_response_contracts(client):
    """OpenAPI publishes the catalog list and detail routes, including the list filters. It does not publish a by-slug route."""
    test_client, _ = client
    schema = test_client.get("/api/openapi.json").json()
    assert "/api/tournaments" in schema["paths"]
    assert "/api/tournaments/{tournament_id}" in schema["paths"]
    assert "/api/tournaments/by-slug/{slug}" not in schema["paths"]
    assert "201" in schema["paths"]["/api/staff/tournaments"]["post"]["responses"]
    assert "200" in schema["paths"]["/api/tournaments"]["get"]["responses"]
    assert {
        parameter["name"]
        for parameter in schema["paths"]["/api/tournaments"]["get"]["parameters"]
    } >= {"name", "starts_from", "starts_to", "limit", "offset"}


@pytest.mark.parametrize(
    "policies",
    [
        {"rules_text": "Fixture rules", "cancellation_policy_text": "Fixture policy"},
        {
            "rules_url": "https://example.test/rules",
            "cancellation_policy_url": "https://example.test/cancel",
        },
        {"rules_text": "Fixture rules", "rules_url": "https://example.test/rules"},
        {},
    ],
)
def test_catalog_preserves_separate_optional_policy_text_and_urls(client, policies):
    test_client, key = client
    created = test_client.post(
        "/api/staff/tournaments", json=_event(**policies), headers=_headers(key, "admin")
    )
    assert created.status_code == 201, created.text
    for name in (
        "rules_text",
        "rules_url",
        "cancellation_policy_text",
        "cancellation_policy_url",
    ):
        assert created.json()[name] == policies.get(name)
    public = test_client.get(f"/api/tournaments/{created.json()['id']}")
    assert public.status_code == 200
    assert public.json()["rules_url"] == policies.get("rules_url")
    assert "pix_key" not in public.json()


@pytest.mark.parametrize("field", ["rules_url", "cancellation_policy_url"])
@pytest.mark.parametrize(
    "value", ["javascript:alert(1)", "file:///etc/passwd", "not a URL"]
)
def test_policy_url_rejects_non_web_links(client, field, value):
    test_client, key = client
    response = test_client.post(
        "/api/staff/tournaments",
        json=_event(**{field: value}),
        headers=_headers(key, "admin"),
    )
    assert response.status_code == 422
