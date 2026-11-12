"""Translate known failures into HTTP responses without defining domain rules."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse

from app.auth.exceptions import (
    AdminAccessRequiredException,
    AuthenticationError,
    AuthenticationUnavailableException,
    InvalidCredentialsException,
)
from app.auth.supabase.exceptions import (
    SupabaseAccountNotFoundError,
    SupabaseAdminUnavailableError,
)
from app.core.files import FileStorageError
from app.tournaments.exceptions import (
    ParentalConsentFormNotAllowedError,
    ParentalConsentFormRequiredError,
    PolicyArchiveError,
    RegistrationConflictError,
    RegistrationDocumentInvalidError,
    RegistrationDocumentTooLargeError,
    RegistrationDocumentTypeNotAllowedError,
    RegistrationNotAllowedError,
    RegistrationResourceNotFoundError,
    TournamentError,
)

logger = logging.getLogger(__name__)

_ERROR_STATUS = {
    SupabaseAccountNotFoundError: 404,
    SupabaseAdminUnavailableError: 503,
    InvalidCredentialsException: 401,
    AuthenticationUnavailableException: 503,
    AdminAccessRequiredException: 403,
    PolicyArchiveError: 422,
    RegistrationNotAllowedError: 400,
    RegistrationResourceNotFoundError: 404,
    RegistrationConflictError: 409,
    RegistrationDocumentInvalidError: 422,
    RegistrationDocumentTooLargeError: 413,
    RegistrationDocumentTypeNotAllowedError: 415,
    ParentalConsentFormRequiredError: 422,
    ParentalConsentFormNotAllowedError: 422,
}


def register_api_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(500)
    async def handle_unexpected_error(request: Request, _error: Exception):
        # FastAPI produces this response outside the request logging middleware.
        request_id = getattr(request.state, "request_id", None)
        headers = {"X-Request-ID": request_id} if request_id else None
        return PlainTextResponse(
            "Internal Server Error", status_code=500, headers=headers
        )

    @app.exception_handler(AuthenticationError)
    @app.exception_handler(TournamentError)
    def handle_domain_error(
        _request: Request, error: AuthenticationError | TournamentError
    ) -> JSONResponse:
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

    @app.exception_handler(FileStorageError)
    def handle_file_storage_error(
        _request: Request, error: FileStorageError
    ) -> JSONResponse:
        logger.error("File storage request failed", exc_info=error)
        return JSONResponse(
            status_code=503, content={"detail": "File storage unavailable"}
        )
