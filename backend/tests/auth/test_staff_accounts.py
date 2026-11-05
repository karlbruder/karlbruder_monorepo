import json
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from app.auth import dependencies
from app.auth.models import User
from app.auth.supabase import admin
from app.main import karlbruder_app


@pytest.fixture
def actor(monkeypatch):
    user = User(id=uuid4(), app_metadata={"karlbruder_role": "admin"})
    monkeypatch.setattr(dependencies, "verify_user", lambda _token: user)
    return user


@pytest.fixture
def client():
    return TestClient(
        karlbruder_app, headers={"Authorization": "Bearer verified-token"}
    )


def mock_provider(monkeypatch, handler):
    monkeypatch.setattr(
        admin,
        "admin_client",
        lambda: httpx.Client(
            base_url="https://test-project.supabase.co/auth/v1/admin/",
            transport=httpx.MockTransport(handler),
        ),
    )


@pytest.mark.parametrize(
    ("role", "status"), [(None, 401), ("regular_user", 403), ("guild_member", 403)]
)
def test_both_staff_account_routes_reject_guests_and_non_admins(
    monkeypatch, role, status
):
    """User-editable metadata cannot grant access to the account directory or role updates."""
    user = User(
        id=uuid4(),
        app_metadata={"karlbruder_role": role},
        user_metadata={"karlbruder_role": "admin"},
    )
    monkeypatch.setattr(dependencies, "verify_user", lambda _token: user)
    mock_provider(
        monkeypatch, lambda _request: pytest.fail("Unexpected provider request")
    )
    headers = {"Authorization": "Bearer verified-token"} if role else {}
    client = TestClient(karlbruder_app, headers=headers)

    assert client.get("/api/staff/users").status_code == status
    assert (
        client.patch(f"/api/staff/users/{user.id}", json={"role": "admin"}).status_code
        == status
    )


def test_admin_lists_provider_pages_with_only_account_fields(
    client, actor, monkeypatch
):
    """A provider next link exposes the following page without exposing private metadata."""
    target = str(uuid4())

    def handler(request):
        assert request.url.path == "/auth/v1/admin/users"
        assert request.url.params["per_page"] == "1"
        page = request.url.params["page"]
        headers = (
            {"Link": '<https://test-project.supabase.co/?page=2>; rel="next"'}
            if page == "1"
            else {}
        )
        return httpx.Response(
            200,
            headers=headers,
            json={
                "users": [
                    {
                        "id": target,
                        "email": "staff@example.test",
                        "app_metadata": {
                            "karlbruder_role": "guild_member"
                            if page == "1"
                            else "unknown"
                        },
                        "user_metadata": {
                            "karlbruder_role": "admin",
                            "private": "hidden",
                        },
                    }
                ]
            },
        )

    mock_provider(monkeypatch, handler)
    first = client.get("/api/staff/users?per_page=1").json()
    assert first == {
        "users": [
            {"id": target, "email": "staff@example.test", "role": "guild_member"}
        ],
        "next_page": 2,
    }
    second = client.get("/api/staff/users?per_page=1&page=2").json()
    assert second["users"][0]["role"] == "regular_user"
    assert second["next_page"] is None


@pytest.mark.parametrize(
    "payload", [{"role": "owner"}, {"role": "admin", "email": "change@example.test"}]
)
def test_role_update_rejects_invalid_role_and_unexpected_fields(
    client, actor, monkeypatch, payload
):
    """Role updates validate the request before calling Supabase."""
    mock_provider(
        monkeypatch, lambda _request: pytest.fail("Unexpected provider request")
    )
    assert client.patch(f"/api/staff/users/{actor.id}", json=payload).status_code == 422


def test_account_routes_validate_pagination_and_uuid(client, actor, monkeypatch):
    """Invalid pagination and account IDs are rejected before contacting Supabase."""
    mock_provider(
        monkeypatch, lambda _request: pytest.fail("Unexpected provider request")
    )
    assert client.get("/api/staff/users?per_page=101").status_code == 422
    assert (
        client.patch("/api/staff/users/invalid", json={"role": "admin"}).status_code
        == 422
    )


@pytest.mark.parametrize(("provider_status", "status"), [(404, 404), (500, 503)])
@pytest.mark.parametrize("failure_method", ["GET", "PUT"])
def test_failed_role_updates_return_safe_errors_and_do_not_log_promotion(
    client, actor, monkeypatch, caplog, provider_status, status, failure_method
):
    """Missing targets and failed writes surface safely without a success log."""
    target = str(uuid4())

    def handler(request):
        if request.method == failure_method:
            return httpx.Response(
                provider_status, json={"message": "private provider error"}
            )
        return httpx.Response(200, json={"id": target})

    mock_provider(monkeypatch, handler)
    response = client.patch(f"/api/staff/users/{target}", json={"role": "admin"})
    assert response.status_code == status
    assert "private provider error" not in response.text
    assert "Application admin promotion" not in caplog.text


def test_provider_timeout_returns_service_unavailable(client, actor, monkeypatch):
    """A provider timeout returns the account-service error."""

    def handler(request):
        raise httpx.ReadTimeout("private provider error", request=request)

    mock_provider(monkeypatch, handler)
    response = client.get("/api/staff/users")
    assert response.status_code == 503
    assert response.json() == {"detail": "Account management service unavailable"}


@pytest.mark.parametrize(
    ("previous", "requested"),
    [
        ("regular_user", "admin"),
        ("admin", "admin"),
        ("admin", "guild_member"),
    ],
)
def test_staff_updates_only_role_and_logs_only_promotions(
    client, actor, monkeypatch, caplog, previous, requested
):
    """Promotion preserves provider metadata and the sole admin can demote themself."""
    target = str(actor.id if previous == "admin" else uuid4())
    metadata = {"karlbruder_role": previous, "provider": "email"}

    def handler(request):
        assert request.url.path == f"/auth/v1/admin/users/{target}"
        if request.method == "PUT":
            payload = json.loads(request.content)
            assert payload == {"app_metadata": {"karlbruder_role": requested}}
            metadata.update(payload["app_metadata"])
        return httpx.Response(200, json={"id": target, "app_metadata": metadata})

    mock_provider(monkeypatch, handler)
    response = client.patch(f"/api/staff/users/{target}", json={"role": requested})
    assert response.status_code == 200
    assert response.json() == {"id": target, "email": None, "role": requested}
    assert metadata == {"karlbruder_role": requested, "provider": "email"}
    promotion = f"Application admin promotion actor={actor.id} target={target}"
    assert (promotion in caplog.text) == (previous != "admin" and requested == "admin")


def test_supabase_client_uses_the_backend_key_and_timeout(monkeypatch):
    """Only the server-side Admin API client receives the configured credential."""
    monkeypatch.setattr(admin.settings, "SUPABASE_SERVICE_ROLE_KEY", "fixture-key")
    with admin.admin_client() as admin_client:
        assert str(admin_client.base_url) == f"{admin.settings.issuer}/admin/"
        assert admin_client.headers["apikey"] == "fixture-key"
        assert admin_client.headers["Authorization"] == "Bearer fixture-key"
        assert admin_client.timeout.read == 5
