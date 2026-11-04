"""Map auth failures to the existing API status, detail, and challenge."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.auth.exceptions import (
    AdminAccessRequiredException,
    AuthenticationError,
    AuthenticationUnavailableException,
    InvalidCredentialsException,
)

_ERROR_STATUS = {
    InvalidCredentialsException: 401,
    AuthenticationUnavailableException: 503,
    AdminAccessRequiredException: 403,
}


def register_auth_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AuthenticationError)
    def handle_auth_error(_request: Request, error: AuthenticationError) -> JSONResponse:
        headers = (
            {"WWW-Authenticate": "Bearer"}
            if isinstance(error, InvalidCredentialsException)
            else None
        )
        return JSONResponse(
            status_code=_ERROR_STATUS[type(error)],
            content={"detail": str(error)},
            headers=headers,
        )
