"""Configure Sentry for the backend."""

import logging
import random
from logging import LogRecord
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from .base import Settings

HEALTH_PATHS = {
    f"{prefix}/health{suffix}"
    for prefix in ("", "/api")
    for suffix in ("", "/db", "/auth")
}


def _traces_sampler(context: dict[str, Any]) -> float:
    scope = context.get("asgi_scope") or {}
    environ = context.get("wsgi_environ") or {}
    path = scope.get("path") or environ.get("PATH_INFO")
    return 0.0 if path in HEALTH_PATHS else 1.0


def _before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    record = hint.get("log_record")
    if isinstance(record, LogRecord) and getattr(
        record, "sentry_already_captured", False
    ):
        return None
    span = sentry_sdk.get_current_span()
    if span is not None and span.containing_transaction is not None:
        span.containing_transaction.set_data("error_captured", True)
    return event


def _before_transaction(event: dict[str, Any], rate: float) -> dict[str, Any] | None:
    if event.get("transaction", "").split(" ", 1)[-1] in HEALTH_PATHS:
        return None
    trace = event.get("contexts", {}).get("trace", {})
    if trace.get("data", {}).get("error_captured"):
        return event
    spans = event.get("spans", [])
    for span in [trace, *spans]:
        if span.get("status") not in (None, "ok", "unknown"):
            return event
        data = span.get("data", {})
        status = data.get("http.response.status_code", data.get("http.status_code"))
        if isinstance(status, (int, float)) and status >= 500:
            return event
    return event if random.random() < rate else None


def setup_sentry(settings: Settings) -> bool:
    if not settings.SENTRY_ENABLED:
        return False

    def before_send_transaction(
        event: dict[str, Any], _hint: dict[str, Any]
    ) -> dict[str, Any] | None:
        return _before_transaction(
            event, settings.SENTRY_SUCCESS_TRANSACTION_SAMPLE_RATE
        )

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENV_NAME,
        release=settings.GIT_SHA,
        integrations=[
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
                sentry_logs_level=getattr(logging, settings.SENTRY_LOG_LEVEL),
            )
        ],
        traces_sampler=_traces_sampler,
        before_send=_before_send,
        before_send_transaction=before_send_transaction,
        include_local_variables=False,
        profiles_sample_rate=0.0,
        enable_logs=True,
        trace_propagation_targets=[],
    )
    scope = sentry_sdk.get_global_scope()
    scope.set_tag("service", "kb-backend")
    scope.set_attribute("service.name", "kb-backend")
    return True
