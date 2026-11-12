"""API assembly preserves documentation, middleware, and framework error behavior."""

import pytest
from fastapi.testclient import TestClient

from app.main import karlbruder_app


def test_swagger_ui_uses_the_api_schema_and_redirect_urls():
    response = TestClient(karlbruder_app).get("/api/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "/api/openapi.json" in response.text
    assert "/api/docs/oauth2-redirect" in response.text


def test_openapi_includes_health_metadata_and_domain_routes_with_bearer_security():
    response = TestClient(karlbruder_app).get("/api/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert {"/api/health", "/api/metadata", "/api/health/db", "/api/health/auth"} <= paths.keys()
    assert "/api/tournaments" in paths
    assert "get" in paths["/api/tournaments"]
    assert "post" not in paths["/api/tournaments"]
    assert paths["/api/staff/tournaments"]["post"]["security"] == [{"HTTPBearer": []}]
    assert "/api/staff/tournaments/payment-reviews" in paths
    assert not any(path.startswith("/api/tournaments/staff/") for path in paths)
    assert paths["/api/users/me"]["get"]["security"] == [{"HTTPBearer": []}]


def test_existing_cors_origin_receives_credentialed_response_headers():
    response = TestClient(karlbruder_app).get(
        "/api/health", headers={"Origin": "http://localhost:3000"}
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/api/redoc", "/openapi.json", "/docs/oauth2-redirect"])
def test_old_documentation_paths_and_redoc_are_not_served(path):
    response = TestClient(karlbruder_app).get(path)

    assert response.status_code == 404


def test_swagger_redirect_helper_is_served_under_api_docs():
    response = TestClient(karlbruder_app).get("/api/docs/oauth2-redirect")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


@pytest.mark.parametrize("fail", [False, True])
def test_lifespan_initializes_and_disposes_sync_and_async_resources(monkeypatch, fail):
    import asyncio
    from unittest.mock import AsyncMock, Mock

    from app.core import db
    from app.main import lifespan

    sync_engine = Mock()
    auth_engine = Mock()
    async_engine = Mock()
    async_engine.dispose = AsyncMock()
    sync_maker = Mock()
    async_maker = Mock()
    monkeypatch.setattr(db, "create_sync_engine", Mock(side_effect=[sync_engine, auth_engine]))
    monkeypatch.setattr(db, "create_async_engine_instance", Mock(return_value=async_engine))
    monkeypatch.setattr(db, "create_sync_session_maker", Mock(return_value=sync_maker))
    monkeypatch.setattr(db, "create_async_session_maker", Mock(return_value=async_maker))

    async def run():
        async with lifespan(karlbruder_app):
            assert db.create_sync_engine.call_args.kwargs == {
                "pool_timeout": 5,
                "connect_args": {"connect_timeout": 5, "options": "-c statement_timeout=5000"},
            }
            assert karlbruder_app.state.account_email_reader.engine is auth_engine
            assert karlbruder_app.state.mail_sender.enabled is False
            assert db.sync_engine is sync_engine
            assert db.async_engine is async_engine
            assert db.sync_session_maker is sync_maker
            assert db.async_session_maker is async_maker
            if fail:
                raise ValueError("application failed")

    if fail:
        with pytest.raises(ValueError, match="application failed"):
            asyncio.run(run())
    else:
        asyncio.run(run())

    auth_engine.dispose.assert_called_once()
    assert karlbruder_app.state.account_email_reader is None
    assert karlbruder_app.state.mail_sender is None
    sync_engine.dispose.assert_called_once()
    async_engine.dispose.assert_awaited_once()
    assert db.sync_engine is None and db.async_engine is None
    assert db.sync_session_maker is None and db.async_session_maker is None


def test_lifespan_disposes_sync_engine_if_async_initialization_fails(monkeypatch):
    import asyncio
    from unittest.mock import Mock

    from app.core import db
    from app.main import lifespan

    sync_engine = Mock()
    monkeypatch.setattr(db, "create_sync_engine", Mock(return_value=sync_engine))
    monkeypatch.setattr(db, "create_async_engine_instance", Mock(side_effect=ValueError("invalid async config")))

    async def run():
        async with lifespan(karlbruder_app):
            pytest.fail("Startup should fail before serving requests")

    with pytest.raises(ValueError, match="invalid async config"):
        asyncio.run(run())

    sync_engine.dispose.assert_called_once()
    assert db.sync_engine is None and db.async_engine is None


def test_lifespan_cleans_domain_resources_if_account_lookup_initialization_fails(monkeypatch):
    import asyncio
    from unittest.mock import AsyncMock, Mock

    from app.core import db
    from app.main import lifespan

    sync_engine = Mock()
    async_engine = Mock(dispose=AsyncMock())
    monkeypatch.setattr(db, "create_sync_engine", Mock(side_effect=[sync_engine, ValueError("invalid auth config")]))
    monkeypatch.setattr(db, "create_async_engine_instance", Mock(return_value=async_engine))
    monkeypatch.setattr(db, "create_sync_session_maker", Mock())
    monkeypatch.setattr(db, "create_async_session_maker", Mock())

    async def run():
        async with lifespan(karlbruder_app):
            pytest.fail("Startup must fail before serving requests")

    with pytest.raises(ValueError, match="invalid auth config"):
        asyncio.run(run())
    sync_engine.dispose.assert_called_once()
    async_engine.dispose.assert_awaited_once()
    assert db.sync_engine is None and db.async_engine is None
    assert karlbruder_app.state.account_email_reader is None


@pytest.mark.parametrize("phase", ["startup", "shutdown"])
def test_lifespan_failure_emits_one_structured_diagnostic(monkeypatch, caplog, phase):
    """The app logs startup and shutdown exceptions before propagating them."""
    from unittest.mock import AsyncMock, Mock

    from app.core import db

    error = RuntimeError("synthetic engine failure")
    sync_engine = Mock()
    if phase == "startup":
        monkeypatch.setattr(db, "create_sync_engine", Mock(side_effect=error))
    else:
        sync_engine.dispose.side_effect = error
        monkeypatch.setattr(db, "create_sync_engine", Mock(side_effect=[sync_engine, Mock()]))
        monkeypatch.setattr(db, "create_async_engine_instance", Mock(return_value=Mock(dispose=AsyncMock())))
        monkeypatch.setattr(db, "create_sync_session_maker", Mock())
        monkeypatch.setattr(db, "create_async_session_maker", Mock())

    with pytest.raises(RuntimeError, match="synthetic engine failure"):
        with TestClient(karlbruder_app):
            pass

    diagnostics = [
        record.msg
        for record in caplog.records
        if isinstance(record.msg, dict) and record.msg.get("event") == "lifespan_failed"
    ]
    assert len(diagnostics) == 1
    assert diagnostics[0]["phase"] == phase
