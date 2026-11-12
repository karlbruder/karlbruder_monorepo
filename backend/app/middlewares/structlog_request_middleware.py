"""Correlate requests and log completion at the ASGI boundary."""

from time import perf_counter
from uuid import uuid4

import sentry_sdk
import structlog
from python_ipware import IpWare
from starlette.datastructures import Headers, MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from config import settings

logger = structlog.get_logger("app.middlewares.request")
_ipware = IpWare()
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


def _normalize_id(value: str) -> str | None:
    value = value.strip()
    return value if len(value) <= 64 and value.isprintable() else None


def _get_client_ip(scope: Scope, headers: Headers) -> str:
    meta = {
        f"HTTP_{name.upper().replace('-', '_')}": value
        for name, value in headers.items()
    }
    if client := scope.get("client"):
        meta["REMOTE_ADDR"] = client[0]
    client_ip, _ = _ipware.get_client_ip(meta)
    return str(client_ip) if client_ip is not None else "unknown"

def _resolve_request_id(headers: Headers) -> str:
    return _normalize_id(headers.get("x-request-id", "")) or str(uuid4())


def _resolve_amzn_trace_id(headers: Headers) -> str | None:
    for field in headers.get("x-amzn-trace-id", "").split(";"):
        key, _, value = field.partition("=")
        if key.strip() == "Root":
            return _normalize_id(value)
    return None


def _resolve_sentry_trace_id(headers: Headers) -> str | None:
    span = sentry_sdk.get_current_span()
    if span and (trace_id := _normalize_id(span.trace_id)):
        return trace_id
    for name in ("sentry-trace", "x-sentry-trace"):
        if trace_id := _normalize_id(headers.get(name, "").partition("-")[0]):
            return trace_id
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
    """Correlate request start and outcome events."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        headers = request.headers
        request_id = _resolve_request_id(headers)
        scope.setdefault("state", {})["request_id"] = request_id
        method = request.method
        request_fields = {
            "method": method if method in _METHODS else "<other>",
            "client_ip": _get_client_ip(scope, headers),
            **_build_request_metadata(request),
        }
        tokens = structlog.contextvars.bind_contextvars(request_id=request_id)
        start = perf_counter()
        code = 500
        failure = None

        async def send_with_request_id(message: Message) -> None:
            nonlocal code
            if message["type"] == "http.response.start":
                code = message["status"]
                MutableHeaders(scope=message)["x-request-id"] = request_id
            await send(message)

        is_health_check_request = scope["path"].removesuffix("/") in (
            settings.HEALTH_CHECK_PATH.removesuffix("/"),
            settings.HEALTH_DB_CHECK_PATH.removesuffix("/"),
            settings.HEALTH_AUTH_CHECK_PATH.removesuffix("/"),
        )
        try:
            if not is_health_check_request:
                logger.info("request_started", **request_fields)
            await self.app(scope, receive, send_with_request_id)
        except Exception as error:
            failure = error
            raise
        finally:
            try:
                route = getattr(scope.get("route"), "path", "<unmatched>")
                fields = {
                    **request_fields,
                    "route": route,
                    "code": code,
                    "duration": round(perf_counter() - start, 3),
                }
                identifiers = {
                    "session_id": _normalize_id(headers.get("x-session-id", "")),
                    "amzn_trace_id": _resolve_amzn_trace_id(headers),
                    "sentry_trace_id": _resolve_sentry_trace_id(headers),
                    "user_id": scope["state"].get("user_id"),
                }
                fields.update(
                    {key: value for key, value in identifiers.items() if value}
                )
                if failure is not None:
                    logger.error("request_failed", exc_info=failure, **fields)
                elif not (is_health_check_request and code < 400):
                    log = logger.error if code >= 500 else logger.info
                    log("request_finished", **fields)
            finally:
                structlog.contextvars.reset_contextvars(**tokens)
