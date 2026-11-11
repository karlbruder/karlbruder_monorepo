import logging
import random
from uuid import uuid4

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

import pytest
import sentry_sdk
from sentry_sdk.transport import Transport

from app.auth.dependencies import get_current_user
from app.auth.models import User
from config import settings
from config.base import Settings
from config.test import TestSettings as BackendTestSettings


class MemoryTransport(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.envelopes = []

    def capture_envelope(self, envelope):
        self.envelopes.append(envelope)


@pytest.fixture
def monitoring(monkeypatch, request):
    transport = MemoryTransport()
    init = sentry_sdk.init

    def init_with_memory_transport(**options):
        return init(**options, transport=transport)

    configured = settings.model_copy(
        update={
            "ENV_NAME": "test",
            "SENTRY_ENABLED": True,
            "SENTRY_DSN": "https://public@example.com/1",
            "SENTRY_SUCCESS_TRANSACTION_SAMPLE_RATE": getattr(request, "param", 0.0),
        }
    )
    monkeypatch.setattr(sentry_sdk, "init", init_with_memory_transport)
    configured.init_sentry(environment=configured.ENV_NAME, release=configured.GIT_SHA)
    yield transport
    sentry_sdk.get_client().close()
    sentry_sdk.get_global_scope().set_client(None)


@pytest.mark.parametrize(
    ("environment", "overrides", "expected"),
    [
        ("local", {}, False),
        ("test", {}, False),
        ("dev", {}, False),
        ("prod", {}, False),
        ("prod", {"SENTRY_ENABLED": True}, True),
    ],
)
def test_monitoring_enablement(monkeypatch, environment, overrides, expected):
    """Require explicit enablement regardless of environment."""
    monkeypatch.delenv("SENTRY_ENABLED", raising=False)
    calls = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))
    configured = BackendTestSettings(_env_file=None, ENV_NAME=environment, **overrides)
    assert (
        configured.init_sentry(environment=environment, release=configured.GIT_SHA)
        is expected
    )
    assert bool(calls) is expected


@pytest.mark.parametrize("overrides", [{}, {"SENTRY_DSN": None}, {"SENTRY_DSN": ""}])
def test_settings_require_a_nonempty_sentry_dsn(monkeypatch, overrides):
    """Reject missing, null, and empty DSNs even with monitoring disabled."""
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    values = settings.model_dump(exclude={"SENTRY_DSN"})
    with pytest.raises(ValidationError, match="SENTRY_DSN"):
        Settings(_env_file=None, **values, **overrides)


def test_settings_reject_null_sentry_enabled():
    """Require a boolean when the enablement flag is provided."""
    with pytest.raises(ValidationError, match="SENTRY_ENABLED"):
        BackendTestSettings(SENTRY_ENABLED=None)


def test_error_and_log_preserve_messages_without_frame_locals(monitoring):
    """Preserve diagnostics while excluding local variables from frames."""
    frame_local = uuid4().hex
    try:
        raise ValueError("exception-diagnostic")
    except ValueError:
        sentry_sdk.capture_exception()
    logging.getLogger("app.test").error("logging-diagnostic")
    sentry_sdk.flush()
    items = [item for envelope in monitoring.envelopes for item in envelope.items]
    assert sum(item.type == "event" for item in items) == 2
    assert any(item.type == "log" for item in items)
    serialized = b"".join(item.get_bytes() for item in items)
    assert b"exception-diagnostic" in serialized
    assert b"logging-diagnostic" in serialized
    assert frame_local.encode() not in serialized


def test_error_retains_transaction_when_success_sampling_is_zero(monitoring):
    """Keep a transaction with a captured error even if its final status is OK."""
    with sentry_sdk.start_transaction(
        name="GET /example", op="http.server"
    ) as transaction:
        sentry_sdk.capture_exception(ValueError("example failure"))
        transaction.set_http_status(200)
    sentry_sdk.flush()
    types = [item.type for envelope in monitoring.envelopes for item in envelope.items]
    assert "transaction" in types
    assert "event" in types


@pytest.mark.parametrize(
    ("monitoring", "retained"),
    [(0.0, False), (0.1, False), (0.11, True), (1.0, True)],
    indirect=["monitoring"],
)
def test_successful_transaction_is_sent_only_below_the_sample_rate(
    monkeypatch, monitoring, retained
):
    """Check which completed transactions reach the Sentry transport."""
    monkeypatch.setattr(random, "random", lambda: 0.1)
    with sentry_sdk.start_transaction(name="GET /example", op="http.server"):
        pass
    sentry_sdk.flush()
    sent = any(
        item.type == "transaction"
        for envelope in monitoring.envelopes
        for item in envelope.items
    )
    assert sent is retained


def test_failed_http_request_emits_one_error_and_a_transaction(monitoring):
    """Capture the failure once even when the server logs the exception."""
    app = FastAPI()

    @app.get("/failure")
    async def failure():
        raise RuntimeError("private-canary")

    async def server(scope, receive, send):
        try:
            await app(scope, receive, send)
        except RuntimeError:
            logging.getLogger("uvicorn.error").exception("ASGI application failed")
            raise

    with TestClient(server, raise_server_exceptions=False) as client:
        assert client.get("/failure").status_code == 500
    sentry_sdk.flush()
    items = [item for envelope in monitoring.envelopes for item in envelope.items]
    assert sum(item.type == "event" for item in items) == 1
    assert sum(item.type == "transaction" for item in items) == 1
    assert any(
        item.type == "log" and b"ASGI application failed" in item.get_bytes()
        for item in items
    )


def test_error_identity_comes_from_the_current_verified_request(
    monkeypatch, monitoring
):
    """Attach the verified identity and keep it out of the next guest request."""
    user = User(id=uuid4(), email="verified@example.test")
    monkeypatch.setattr("app.auth.dependencies.verify_user", lambda token: user)
    app = FastAPI()

    @app.get("/diagnostic", dependencies=[Depends(get_current_user)])
    async def diagnostic():
        sentry_sdk.capture_message("request diagnostic")
        return {}

    with TestClient(app) as client:
        assert client.get(
            "/diagnostic", headers={"Authorization": "Bearer test"}
        ).is_success
        assert client.get("/diagnostic").is_success

    events = [
        item.payload.json
        for envelope in monitoring.envelopes
        for item in envelope.items
        if item.type == "event"
    ]
    assert len(events) == 2
    assert events[0]["user"] == {"id": str(user.id), "email": user.email}
    guest = events[1].get("user", {})
    assert guest.get("id") != str(user.id)
    assert guest.get("email") is None


def test_failure_status_and_child_span_failure_retain_transactions(monitoring):
    """Keep both HTTP failures and failures reported on a child span."""
    with sentry_sdk.start_transaction(
        name="http failure", op="http.server"
    ) as transaction:
        transaction.set_http_status(503)
    with sentry_sdk.start_transaction(name="dependency failure", op="http.server"):
        with sentry_sdk.start_span(op="http.client") as span:
            span.set_status("internal_error")
    sentry_sdk.flush()
    items = [item for envelope in monitoring.envelopes for item in envelope.items]
    assert sum(item.type == "transaction" for item in items) == 2


def test_sampling_rate_validation_rejects_invalid_values():
    """Reject rates outside the unit interval and non-finite values."""
    for rate in (-0.1, 1.1, float("nan"), float("inf")):
        with pytest.raises(ValidationError):
            BackendTestSettings(SENTRY_SUCCESS_TRANSACTION_SAMPLE_RATE=rate)


def test_marked_duplicate_error_still_emits_a_log(monitoring):
    """Suppress only the duplicate error event for a marked record."""
    logging.getLogger("app.test").error(
        "already reported", extra={"sentry_already_captured": True}
    )
    sentry_sdk.flush()
    items = [item for envelope in monitoring.envelopes for item in envelope.items]
    assert all(item.type != "event" for item in items)
    assert any(
        item.type == "log" and b"already reported" in item.get_bytes() for item in items
    )


def test_uvicorn_loggers_emit_log_items_with_service_context(monitoring):
    """Send both worker loggers through the standard logging integration."""
    for name in ("uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).warning(f"diagnostic from {name}")
    sentry_sdk.flush()
    logs = b"".join(
        item.get_bytes()
        for envelope in monitoring.envelopes
        for item in envelope.items
        if item.type == "log"
    )
    assert b"diagnostic from uvicorn.error" in logs
    assert b"diagnostic from uvicorn.access" in logs
    assert b"kb-backend" in logs


def test_health_failures_report_errors_without_transactions(monitoring):
    """Exclude exact health paths without dropping their errors."""
    app = FastAPI()

    async def fail():
        raise RuntimeError("health diagnostic")

    for prefix in ("", "/api"):
        for suffix in ("", "/db", "/auth"):
            app.add_api_route(f"{prefix}/health{suffix}", fail)
    app.add_api_route("/api/health/other", fail)

    with TestClient(app, raise_server_exceptions=False) as client:
        for prefix in ("", "/api"):
            for suffix in ("", "/db", "/auth"):
                assert client.get(f"{prefix}/health{suffix}").status_code == 500
        assert client.get("/api/health/other").status_code == 500

    items = [item for envelope in monitoring.envelopes for item in envelope.items]
    assert sum(item.type == "event" for item in items) == 7
    assert sum(item.type == "transaction" for item in items) == 1


def test_monitoring_disables_profiling_and_frame_locals(monitoring):
    """Check the SDK configuration for profiling and frame locals."""
    options = sentry_sdk.get_client().options
    assert options["profiles_sample_rate"] == 0
    assert options["include_local_variables"] is False
