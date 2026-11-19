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
    from unittest.mock import Mock

    storage = Mock()
    storage.create_presigned_get_url.side_effect = (
        lambda key, **kwargs: f"https://archive.example.test/{key}"
    )
    karlbruder_app.dependency_overrides[get_file_storage] = lambda: storage
    signing_key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        tokens, "get_jwks_client", lambda: StaticJwksClient(signing_key.public_key())
    )
    with TestClient(karlbruder_app) as test_client:
        yield test_client, signing_key
    karlbruder_app.dependency_overrides.pop(get_file_storage, None)


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
    """An admin can create more than one tournament, and the public catalog returns each one with its own discipline.

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
            "Second Fixture", discipline="sabre"
        ),
        headers=admin,
    )
    assert first.status_code == second.status_code == 201
    first_data, second_data = first.json(), second.json()
    assert first_data["id"] != second_data["id"]
    assert first_data["name"] == "Monomachia Fixture"
    assert first_data["slug"].startswith("fixture-")
    assert "registration_fee_amount" not in first_data
    assert "registration_fee_amount" not in second_data
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
    assert "registration_fee_amount" not in detail.json()


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
        {"registration_fee_amount": "75.00"},
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


def test_staff_and_catalog_use_uploaded_policies_exclusively(client):
    """Legacy fields are absent from reads and rejected in staff writes."""
    test_client, key = client
    admin = _headers(key, "admin")
    staff_path = "/api/staff/tournaments"
    created = test_client.post(staff_path, json=_event(), headers=admin)
    assert created.status_code == 201, created.text
    event_id = created.json()["id"]
    legacy = {
        "rules_text": "Fixture rules",
        "rules_url": "https://example.test/rules",
        "cancellation_policy_text": "Fixture policy",
        "cancellation_policy_url": "https://example.test/policy",
    }
    for read in (
        created,
        test_client.get(f"{staff_path}/{event_id}", headers=admin),
        test_client.get(f"/api/tournaments/{event_id}"),
    ):
        assert read.status_code in (200, 201), read.text
        value = read.json()
        assert legacy.keys().isdisjoint(value)
        assert value["acceptance_content"]["pt"]["policies"] == {
            "rules": {"document": None},
            "cancellation_policy": {"document": None},
        }

    for write in (
        test_client.post(staff_path, json=_event(**legacy), headers=admin),
        test_client.put(f"{staff_path}/{event_id}", json=_event(**legacy), headers=admin),
    ):
        assert write.status_code == 422, write.text
        assert {error["loc"][-1] for error in write.json()["detail"]} == legacy.keys()


def test_tournament_products_follow_visibility_and_keep_empty_catalogs(client, db_session):
    from decimal import Decimal
    from app.karlmart.catalog.models import Price, Product
    from app.tournaments.models import Tournament, TournamentProduct

    test_client, key = client
    admin = _headers(key, "admin")
    public_id = test_client.post("/api/staff/tournaments", json=_event(), headers=admin).json()["id"]
    internal_id = test_client.post("/api/staff/tournaments", json=_event(internal=True), headers=admin).json()["id"]
    product = Product(name="Internal entry", description="Members only")
    db_session.add(product)
    db_session.flush()
    db_session.add_all([
        TournamentProduct(tournament_id=internal_id, product_id=product.id),
        Price(product_id=product.id, amount=Decimal("50.00")),
    ])
    db_session.flush()

    assert test_client.get(f"/api/tournaments/{public_id}/products").json() == []
    assert test_client.get("/api/tournaments/999999999/products").status_code == 404
    for headers in ({}, _headers(key, "regular_user")):
        assert test_client.get(f"/api/tournaments/{internal_id}/products", headers=headers).status_code == 404
    for headers in (_headers(key, "guild_member"), admin):
        response = test_client.get(f"/api/tournaments/{internal_id}/products", headers=headers)
        assert response.status_code == 200
        assert [item["name"] for item in response.json()] == ["Internal entry"]
    tournament = db_session.get(Tournament, internal_id)
    tournament.is_internal = False
    db_session.flush()
    assert test_client.get(f"/api/tournaments/{internal_id}/products").status_code == 200
    tournament.is_internal = True
    db_session.flush()
    assert test_client.get(f"/api/tournaments/{internal_id}/products").status_code == 404


def test_policy_versions_are_scoped_visible_and_retained(client, db_session):
    from app.core.files import get_file_storage

    test_client, signing_key = client
    admin = _headers(signing_key, "admin")
    regular = _headers(signing_key, "regular_user")
    member = _headers(signing_key, "guild_member")
    storage = karlbruder_app.dependency_overrides[get_file_storage]()
    objects = {}
    storage.create_presigned_put_url.side_effect = lambda key, **kw: f"https://upload.test/{key}"
    storage.head_object.side_effect = lambda key: (len(objects[key]), None)
    storage.read_object_bytes.side_effect = lambda key, **kw: objects[key]
    storage.store_file.side_effect = lambda key, body, content_type: objects.update({key: body})
    storage.delete_file.side_effect = lambda key: objects.pop(key, None)
    public_id = test_client.post("/api/staff/tournaments", json=_event(), headers=admin).json()["id"]
    internal_id = test_client.post("/api/staff/tournaments", json=_event(internal=True), headers=admin).json()["id"]

    def publish(tournament_id, purpose, body):
        base = f"/api/staff/tournaments/{tournament_id}/policy-documents/{purpose}"
        issued = test_client.post(base + "/upload-url", headers=admin)
        assert issued.status_code == 200
        staged = issued.json()["storage_key"]
        objects[staged] = body
        result = test_client.post(base, headers=admin, json={"storage_key": staged, "original_file_name": "policy.pdf"})
        assert result.status_code == 201, result.text
        return result.json()

    base = f"/api/staff/tournaments/{public_id}/policy-documents/rules"
    assert test_client.post(base + "/upload-url", headers=regular).status_code == 403
    assert test_client.post(base, headers=regular, json={"storage_key": "x", "original_file_name": "x"}).status_code == 403
    first = publish(public_id, "rules", b"%PDF-1.4 first")
    staff_path = f"/api/staff/tournaments/{public_id}"
    assert test_client.put(staff_path, headers=admin, json=_event(refunds_allowed=True)).status_code == 422
    cancellation = publish(public_id, "cancellation_policy", b"%PDF-1.4 cancel")
    saved = test_client.put(staff_path, headers=admin, json=_event(refunds_allowed=True))
    assert saved.status_code == 200, saved.text
    assert saved.json()["refunds_allowed"] is True
    second = publish(public_id, "rules", b"%PDF-1.4 second")
    hidden = publish(internal_id, "rules", b"%PDF-1.4 hidden")
    current = test_client.get(f"/api/tournaments/{public_id}/policy-documents").json()
    assert current["rules"]["id"] == second["id"]
    assert current["cancellation_policy"]["id"] == cancellation["id"]
    from sqlalchemy import select
    from app.tournaments.models import TournamentDocument

    rules = db_session.scalar(select(TournamentDocument).where(TournamentDocument.tournament_id == public_id, TournamentDocument.purpose == "rules"))
    assert rules.current_version.id == second["id"]
    assert [version.id for version in rules.versions] == [second["id"], first["id"]]
    old_url = f"/api/tournaments/{public_id}/policy-documents/rules/{first['id']}/download-url"
    old = test_client.get(old_url)
    assert old.status_code == 200
    assert objects[old.json()["download_url"].split("/", 3)[-1]] == b"%PDF-1.4 first"
    assert test_client.get(f"/api/tournaments/{internal_id}/policy-documents", headers=regular).status_code == 404
    assert test_client.get(f"/api/tournaments/{internal_id}/policy-documents", headers=member).status_code == 200
    assert test_client.get(f"/api/tournaments/{public_id}/policy-documents/rules/{hidden['id']}/download-url").status_code == 404
    assert test_client.get(f"/api/tournaments/{public_id}/policy-documents/cancellation_policy/{first['id']}/download-url").status_code == 404
    staged = test_client.post(base + "/upload-url", headers=admin).json()["storage_key"]
    objects[staged] = b"invalid"
    assert test_client.post(base, headers=admin, json={"storage_key": staged, "original_file_name": "bad.pdf"}).status_code == 415
    assert test_client.get(f"/api/tournaments/{public_id}/policy-documents").json()["rules"]["id"] == second["id"]
    for body, expected in [(b"", 422), (b"%PDF" + b"x" * (10 * 1024 * 1024), 413)]:
        staged = test_client.post(base + "/upload-url", headers=admin).json()["storage_key"]
        objects[staged] = body
        assert test_client.post(base, headers=admin, json={"storage_key": staged, "original_file_name": "bad.pdf"}).status_code == expected
    assert test_client.delete(f"/api/staff/tournaments/{internal_id}", headers=admin).status_code == 204


def test_policy_publication_failure_preserves_previous_version(client, db_session, monkeypatch):
    from app.core.files import get_file_storage

    test_client, signing_key = client
    admin = _headers(signing_key, "admin")
    storage = karlbruder_app.dependency_overrides[get_file_storage]()
    objects = {}
    storage.create_presigned_put_url.return_value = "https://upload.test"
    storage.head_object.side_effect = lambda key: (len(objects[key]), None)
    storage.read_object_bytes.side_effect = lambda key, **kw: objects[key]
    storage.store_file.side_effect = lambda key, body, content_type: objects.update({key: body})
    storage.delete_file.side_effect = lambda key: objects.pop(key, None)
    tournament_id = test_client.post("/api/staff/tournaments", json=_event(), headers=admin).json()["id"]
    base = f"/api/staff/tournaments/{tournament_id}/policy-documents/rules"

    def stage():
        key = test_client.post(base + "/upload-url", headers=admin).json()["storage_key"]
        objects[key] = b"%PDF-1.4 contents"
        return key

    key = stage()
    original = test_client.post(base, headers=admin, json={"storage_key": key, "original_file_name": "first.pdf"}).json()
    saved_objects = objects.copy()
    key = stage()
    from app.core.files import FileStorageError
    storage.store_file.side_effect = FileStorageError("storage unavailable")
    assert test_client.post(base, headers=admin, json={"storage_key": key, "original_file_name": "second.pdf"}).status_code == 503
    assert objects == saved_objects
    storage.store_file.side_effect = lambda key, body, content_type: objects.update({key: body})
    key = stage()
    with monkeypatch.context() as patch:
        patch.setattr(db_session, "commit", lambda: (_ for _ in ()).throw(RuntimeError("database unavailable")))
        with pytest.raises(RuntimeError, match="database unavailable"):
            test_client.post(base, headers=admin, json={"storage_key": key, "original_file_name": "second.pdf"})
    assert objects == saved_objects
    assert test_client.get(f"/api/tournaments/{tournament_id}/policy-documents").json()["rules"]["id"] == original["id"]


def test_policy_staging_is_bound_to_staff_tournament_and_purpose(client):
    from app.core.files import get_file_storage

    test_client, signing_key = client
    admin = _headers(signing_key, "admin")
    other_admin = _headers(signing_key, "admin")
    storage = karlbruder_app.dependency_overrides[get_file_storage]()
    storage.create_presigned_put_url.return_value = "https://upload.test"
    first = test_client.post("/api/staff/tournaments", json=_event(), headers=admin).json()["id"]
    second = test_client.post("/api/staff/tournaments", json=_event(), headers=admin).json()["id"]
    base = f"/api/staff/tournaments/{first}/policy-documents/rules"
    key = test_client.post(base + "/upload-url", headers=admin).json()["storage_key"]
    payload = {"storage_key": key, "original_file_name": "rules.pdf"}
    assert test_client.post(base, headers=other_admin, json=payload).status_code == 422
    assert test_client.post(f"/api/staff/tournaments/{second}/policy-documents/rules", headers=admin, json=payload).status_code == 422
    assert test_client.post(f"/api/staff/tournaments/{first}/policy-documents/cancellation_policy", headers=admin, json=payload).status_code == 422
    storage.head_object.assert_not_called()


def test_tournament_documents_allow_multiple_resources_but_one_policy_per_purpose(db_session):
    from sqlalchemy.exc import IntegrityError
    from app.tournaments.models import Tournament, TournamentDocument

    tournament = Tournament(name="Documents", slug=f"documents-{uuid4()}", starts_at=datetime.now(UTC))
    db_session.add(tournament)
    db_session.flush()
    db_session.add_all([
        TournamentDocument(tournament_id=tournament.id, purpose=None, title="City guide"),
        TournamentDocument(tournament_id=tournament.id, purpose=None, title="Travel guide"),
        TournamentDocument(tournament_id=tournament.id, purpose="rules", title="Rules"),
    ])
    db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(TournamentDocument(tournament_id=tournament.id, purpose="rules", title="Other rules"))
        db_session.flush()
