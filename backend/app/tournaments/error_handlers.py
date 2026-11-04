"""Translate tournament and document errors to the established API response shape."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.files import FileStorageError
from app.tournaments.exceptions import (
    ParentalConsentFormNotAllowedError,
    ParentalConsentFormRequiredError,
    RegistrationConflictError,
    RegistrationDocumentInvalidError,
    RegistrationDocumentTooLargeError,
    RegistrationDocumentTypeNotAllowedError,
    RegistrationNotAllowedError,
    RegistrationResourceNotFoundError,
    TournamentError,
)

_ERROR_STATUS = {
    RegistrationNotAllowedError: 400,
    RegistrationResourceNotFoundError: 404,
    RegistrationConflictError: 409,
    RegistrationDocumentInvalidError: 422,
    RegistrationDocumentTooLargeError: 413,
    RegistrationDocumentTypeNotAllowedError: 415,
    ParentalConsentFormRequiredError: 422,
    ParentalConsentFormNotAllowedError: 422,
}


def register_tournament_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(TournamentError)
    def handle_tournament_error(
        _request: Request, error: TournamentError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=_ERROR_STATUS[type(error)], content={"detail": str(error)}
        )

    @app.exception_handler(FileStorageError)
    def handle_file_storage_error(
        _request: Request, _error: FileStorageError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503, content={"detail": "File storage unavailable"}
        )
