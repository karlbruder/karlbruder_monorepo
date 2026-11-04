"""Health endpoint contracts remain independent of application identity."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.health import checks, router
from app.main import karlbruder_app


@pytest.fixture
def client():
    with TestClient(karlbruder_app) as test_client:
        yield test_client


def test_auth_health_reports_connectivity_separately_from_schema_presence(client):
    response = client.get("/api/health/auth")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["auth"] == "connected"
    assert body["result"] == 1
    assert body["schema"] == {"auth": False}
    assert ":***@" in body["database_url"]


def test_auth_health_returns_existing_failure_shape_without_database_details(client, monkeypatch):
    def unavailable_engine(_database_url):
        raise OperationalError("SELECT 1", {}, RuntimeError("private database details"))

    monkeypatch.setattr(checks, "create_sync_engine", unavailable_engine)

    response = client.get("/api/health/auth")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "auth": "disconnected"}


def test_health_returns_empty_success_without_credentials(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.content == b""


def test_database_health_reports_public_schema_without_exposing_password(client):
    response = client.get("/api/health/db")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"
    assert body["result"] == 1
    assert body["schema"] == {"public": True}
    assert ":***@" in body["database_url"]


def test_database_health_hides_failure_details_behind_existing_503_response(client, monkeypatch):
    def unavailable_database():
        raise OperationalError("SELECT 1", {}, RuntimeError("private database details"))

    monkeypatch.setattr(router, "check_domain_database", unavailable_database)

    response = client.get("/api/health/db")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "disconnected"}
