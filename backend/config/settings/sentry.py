"""Configure Sentry for the backend."""

import random
from functools import partial
from logging import LogRecord
from typing import Any

import sentry_sdk
from pydantic import Field
from pydantic_settings import BaseSettings
from sentry_sdk.integrations.logging import ignore_logger


def _is_structlog_log_record(record: LogRecord) -> bool:
    """Recognize Structlog's event dictionary before console or JSON formatting."""
    return bool(getattr(record, "_from_structlog", False)) or isinstance(
        record.msg, dict
    )


def _traces_sampler(context: dict[str, Any], *, health_paths: tuple[str, ...]) -> float:
    scope = context.get("asgi_scope") or {}
    environ = context.get("wsgi_environ") or {}
    path = scope.get("path") or environ.get("PATH_INFO")
    return 0.0 if path in health_paths else 1.0


def _before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    record = hint.get("log_record")
    if isinstance(record, LogRecord) and (
        _is_structlog_log_record(record)
        or getattr(record, "sentry_already_captured", False)
    ):
        return None
    span = sentry_sdk.get_current_span()
    if span is not None and span.containing_transaction is not None:
        span.containing_transaction.set_data("error_captured", True)
    return event


def _before_send_transaction(
    event: dict[str, Any],
    _hint: dict[str, Any],
    *,
    rate: float,
    health_paths: tuple[str, ...],
) -> dict[str, Any] | None:
    if event.get("transaction", "").split(" ", 1)[-1] in health_paths:
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


class SentrySettings(BaseSettings):
    SENTRY_DSN: str = Field(min_length=1)
    SENTRY_ENABLED: bool = False
    SENTRY_SUCCESS_TRANSACTION_SAMPLE_RATE: float = Field(
        default=0.1, ge=0, le=1, allow_inf_nan=False
    )

    def init_sentry(
        self, *, environment: str, release: str, health_paths: tuple[str, ...]
    ) -> bool:
        if not self.SENTRY_ENABLED:
            return False

        ignore_logger("uvicorn.access")
        ignore_logger("uvicorn.error")
        ignore_logger("app.middlewares.request")
        sentry_sdk.init(
            dsn=self.SENTRY_DSN,
            environment=environment,
            release=release,
            traces_sampler=partial(_traces_sampler, health_paths=health_paths),
            before_send=_before_send,
            before_send_transaction=partial(
                _before_send_transaction,
                rate=self.SENTRY_SUCCESS_TRANSACTION_SAMPLE_RATE,
                health_paths=health_paths,
            ),
            max_request_body_size="never",
            include_local_variables=False,
            profiles_sample_rate=0.0,
            trace_propagation_targets=[],
        )
        scope = sentry_sdk.get_global_scope()
        scope.set_tag("service", "kb-backend")
        return True
