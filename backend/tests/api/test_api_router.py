"""Release metadata uses the configured build values."""

from fastapi.testclient import TestClient

from app.main import karlbruder_app
from config import settings


def test_metadata_returns_configured_release_values(monkeypatch):
    monkeypatch.setattr(settings, "GIT_SHA", "test-release")
    monkeypatch.setattr(settings, "RELEASED_AT", "2026-11-04T00:00:00Z")

    response = TestClient(karlbruder_app).get("/api/metadata")

    assert response.status_code == 200
    assert response.json() == {
        "git_sha": "test-release",
        "released_at": "2026-11-04T00:00:00Z",
    }
