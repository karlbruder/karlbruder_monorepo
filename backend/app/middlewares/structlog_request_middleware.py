"""Correlate requests and log completion at the ASGI boundary."""

import re
from time import perf_counter
from uuid import UUID, uuid4

import sentry_sdk
import structlog
from starlette.datastructures import Headers, MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from config.settings.sentry import HEALTH_PATHS

logger = structlog.get_logger(__name__)
_METHODS = {
    "CONNECT",
    "DELETE",
    "GET",
    "HEAD",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
    "TRACE",
}


_REQUEST_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")
_AMZN_TRACE_ROOT = re.compile(r"1-[0-9a-fA-F]{8}-[0-9a-fA-F]{24}")
_SENTRY_TRACE = re.compile(r"([0-9a-fA-F]{32})(?:-[0-9a-fA-F]{16}(?:-[01])?)?")


def _resolve_request_id(headers: Headers) -> str:
    incoming = headers.get("x-request-id", "")
    return incoming if _REQUEST_ID_PATTERN.fullmatch(incoming) else uuid4().hex


def _resolve_session_id(headers: Headers) -> str | None:
    incoming = headers.get("x-session-id", "")
    if len(incoming) == 36:
        try:
            return str(UUID(incoming))
        except ValueError:
            return None
    return None


def _resolve_amzn_trace_id(headers: Headers) -> str | None:
    incoming = headers.get("x-amzn-trace-id", "")
    if len(incoming) > 512:
        return None
    for field in incoming.split(";"):
        key, _, value = field.strip().partition("=")
        if key == "Root" and _AMZN_TRACE_ROOT.fullmatch(value):
            return value.lower()
    return None


def _resolve_sentry_trace_id(headers: Headers) -> str | None:
    span = sentry_sdk.get_current_span()
    if span and _SENTRY_TRACE.fullmatch(span.trace_id):
        return span.trace_id.lower()
    for name in ("sentry-trace", "x-sentry-trace"):
        if match := _SENTRY_TRACE.fullmatch(headers.get(name, "")):
            return match[1].lower()
    return None


def _build_request_metadata(request: Request) -> dict[str, str]:
    path = request.url.path
    query_string = request.url.query
    metadata = {
        "path": path,
        "query_string": query_string,
        "full_path": f"{path}?{query_string}" if query_string else path,
        "absolute_uri": str(request.url),
    }
    for header in ("user-agent", "host", "origin"):
        if value := request.headers.get(header):
            metadata[header.replace("-", "_")] = value
    return metadata


class StructlogRequestMiddleware:
    """Bind request context and log one event when the request finishes."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        request_id = _resolve_request_id(headers)
        scope.setdefault("state", {})["request_id"] = request_id
        tokens = structlog.contextvars.bind_contextvars(request_id=request_id)
        start = perf_counter()
        status = 500
        failure = None

        async def send_with_request_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message)["x-request-id"] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as error:
            failure = error
            raise
        finally:
            try:
                route = getattr(scope.get("route"), "path", "<unmatched>")
                method = scope["method"]
                fields = {
                    "method": method if method in _METHODS else "<other>",
                    "route": route,
                    "status": status,
                    "duration_ms": round((perf_counter() - start) * 1000, 3),
                    **_build_request_metadata(Request(scope)),
                }
                identifiers = {
                    "session_id": _resolve_session_id(headers),
                    "amzn_trace_id": _resolve_amzn_trace_id(headers),
                    "sentry_trace_id": _resolve_sentry_trace_id(headers),
                    "user_id": scope["state"].get("user_id"),
                }
                fields.update(
                    {key: value for key, value in identifiers.items() if value}
                )
                if failure is not None:
                    logger.error("request_failed", exc_info=failure, **fields)
                elif not (route in HEALTH_PATHS and 200 <= status < 300):
                    log = logger.error if status >= 500 else logger.info
                    log("request_finished", **fields)
            finally:
                structlog.contextvars.reset_contextvars(**tokens)
