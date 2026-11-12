import asyncio
import logging
from uuid import UUID

import httpx
import pytest
import structlog
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.exception_handlers import register_api_exception_handlers
from app.main import karlbruder_app
from app.middlewares.structlog_request_middleware import StructlogRequestMiddleware

LOGGER_NAME = "app.middlewares.request"


@pytest.mark.parametrize("path", ["/api/health", "/api/health/"])
def test_healthy_requests_keep_valid_ids_and_omit_access_logs(caplog, path):
    """Successful health requests return their ID without an access event."""
    with caplog.at_level("INFO", logger=LOGGER_NAME):
        response = TestClient(karlbruder_app).get(
            path, headers={"X-Request-ID": "health-check"}
        )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "health-check"
    assert not [record for record in caplog.records if record.name == LOGGER_NAME]


def test_unexpected_failure_returns_id_and_logs_one_traceback(caplog):
    """FastAPI adds the ID to its 500 while the middleware logs the route template."""
    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)

    register_api_exception_handlers(app)

    @app.get("/items/{item_id}")
    async def fail():
        raise RuntimeError("private exception detail")

    with caplog.at_level("INFO", logger=LOGGER_NAME):
        response = TestClient(app, raise_server_exceptions=False).get(
            "/items/private-item?secret=value", headers={"X-Request-ID": "x" * 65}
        )

    assert response.status_code == 500
    assert response.text == "Internal Server Error"
    request_id = response.headers["x-request-id"]
    assert str(UUID(request_id)) == request_id
    assert UUID(request_id).version == 4
    events = [record.msg for record in caplog.records if record.name == LOGGER_NAME]
    assert [event["event"] for event in events] == ["request_started", "request_failed"]
    failure = events[1]["exc_info"]
    assert isinstance(failure, RuntimeError)

    server_logger = logging.getLogger("uvicorn.error")
    server_logger.error("Exception in ASGI application", exc_info=failure)
    server_logger.error("Independent server failure", exc_info=RuntimeError("server"))
    server_messages = [
        record.getMessage() for record in caplog.records if record.name == "uvicorn.error"
    ]
    assert server_messages == ["Independent server failure"]
    assert {event["request_id"] for event in events} == {request_id}
    assert events[1]["route"] == "/items/{item_id}"
    assert events[1]["code"] == 500


def test_concurrent_requests_keep_separate_context_and_restore_caller_context():
    """Concurrent requests see their own ID and restore the prior binding."""
    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)

    @app.get("/context")
    async def read_context():
        await asyncio.sleep(0)
        return structlog.contextvars.get_contextvars()["request_id"]

    async def request_pair():
        tokens = structlog.contextvars.bind_contextvars(request_id="caller")
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:

                async def get(request_id):
                    response = await client.get(
                        "/context", headers={"X-Request-ID": request_id}
                    )
                    assert response.json() == request_id
                    assert response.headers["x-request-id"] == request_id
                    assert (
                        structlog.contextvars.get_contextvars()["request_id"]
                        == "caller"
                    )

                await asyncio.gather(get("first"), get("second"))
        finally:
            structlog.contextvars.reset_contextvars(**tokens)

    asyncio.run(request_pair())


def test_access_event_includes_optional_correlation_ids(monkeypatch, caplog):
    """Access events include a session ID, the active trace, and verified identity."""
    from types import SimpleNamespace

    from fastapi import Depends

    from app.auth import dependencies
    from app.auth.models import User

    user_id = "7fe26075-c08c-4917-9eca-8796e99ba9c6"
    session_id = "browser-session"
    trace_id = "ae61d241a26c40578ac6284c2c22be8a"
    monkeypatch.setattr(dependencies, "verify_user", lambda _token: User(id=user_id))
    monkeypatch.setattr(
        dependencies.sentry_sdk,
        "get_current_span",
        lambda: SimpleNamespace(trace_id=trace_id),
    )
    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)

    @app.get("/", dependencies=[Depends(dependencies.require_authenticated_user)])
    async def authenticated():
        return {}

    with caplog.at_level("INFO", logger=LOGGER_NAME):
        response = TestClient(app).get(
            "/",
            headers={"Authorization": "Bearer test-token", "X-Session-ID": session_id},
        )
    assert response.status_code == 200
    event = next(
        record.msg
        for record in caplog.records
        if record.name == LOGGER_NAME and record.msg["event"] == "request_finished"
    )
    assert event["session_id"] == session_id
    assert event["sentry_trace_id"] == trace_id
    assert event["user_id"] == user_id


def test_access_event_extracts_trace_ids_and_omits_empty_or_long_ids(caplog):
    """AWS and Sentry headers contribute their trace IDs when present and bounded."""
    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)
    client = TestClient(app)
    amzn_id = "1-65abcdef-0123456789abcdef01234567"
    sentry_id = "ae61d241a26c40578ac6284c2c22be8a"

    with caplog.at_level("INFO", logger=LOGGER_NAME):
        client.get(
            "/missing",
            headers={
                "X-Amzn-Trace-Id": f"Self=ignored;Root={amzn_id};Private=value",
                "Sentry-Trace": f"{sentry_id}-0123456789abcdef-1",
            },
        )
        client.get(
            "/missing",
            headers={
                "X-Amzn-Trace-Id": "Root=",
                "X-Sentry-Trace": "x" * 65,
                "X-Session-ID": "x" * 65,
            },
        )

    first, second = [
        record.msg
        for record in caplog.records
        if record.name == LOGGER_NAME and record.msg["event"] == "request_finished"
    ]
    assert first["amzn_trace_id"] == amzn_id
    assert first["sentry_trace_id"] == sentry_id
    assert {"amzn_trace_id", "sentry_trace_id", "session_id"}.isdisjoint(second)


def test_access_metadata_uses_request_url_and_headers(caplog, configure_log_formatter):
    """Rendered access logs include the requested metadata from the request."""
    import json

    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)

    @app.get("/items/{item_id}")
    async def read_item():
        return {}

    with caplog.at_level("INFO", logger=LOGGER_NAME):
        TestClient(app, base_url="https://api.example.org").get(
            "/items/42?view=summary",
            headers={"Origin": "https://app.example.org", "User-Agent": "Test Agent"},
        )

    record = next(
        record
        for record in caplog.records
        if record.name == LOGGER_NAME and record.msg["event"] == "request_finished"
    )
    rendered = configure_log_formatter(json_logs=True).format(record)
    payload = json.loads(rendered)
    assert payload["route"] == "/items/{item_id}"
    assert payload["path"] == "/items/42"
    assert payload["query_string"] == "view=summary"
    assert payload["full_path"] == "/items/42?view=summary"
    assert payload["absolute_uri"] == f"https://api.example.org{payload['full_path']}"
    assert payload["user_agent"] == "Test Agent"
    assert payload["host"] == "api.example.org"
    assert payload["origin"] == "https://app.example.org"


def test_failed_health_check_emits_only_an_outcome(caplog):
    """Health traffic stays quiet at request start and logs a failed response."""
    from fastapi.responses import Response

    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)

    @app.get("/api/health/db")
    async def unhealthy():
        return Response(status_code=503)

    with caplog.at_level("INFO", logger=LOGGER_NAME):
        TestClient(app).get("/api/health/db")

    events = [record.msg for record in caplog.records if record.name == LOGGER_NAME]
    assert [event["event"] for event in events] == ["request_finished"]
    assert events[0]["code"] == 503


@pytest.mark.parametrize(
    ("forwarded_for", "peer", "client_ip"),
    [
        ("192.0.2.11", "192.0.2.10", "192.0.2.11"),
        ("invalid", "192.0.2.10", "192.0.2.10"),
        ("invalid", "invalid", "unknown"),
    ],
)
def test_start_and_outcome_log_the_ipware_client_address(
    caplog, forwarded_for, peer, client_ip
):
    """Both events report the forwarded client, peer fallback, or unknown."""

    app = FastAPI()
    app.add_middleware(StructlogRequestMiddleware)

    async def request():
        transport = httpx.ASGITransport(app=app, client=(peer, 12345))
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            await client.get("/missing", headers={"X-Forwarded-For": forwarded_for})

    with caplog.at_level("INFO", logger=LOGGER_NAME):
        asyncio.run(request())

    events = [record.msg for record in caplog.records if record.name == LOGGER_NAME]
    assert [event["event"] for event in events] == [
        "request_started",
        "request_finished",
    ]
    assert {event["client_ip"] for event in events} == {client_ip}
