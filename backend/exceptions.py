from typing import ClassVar

from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for consistent API error responses."""

    STATUS_CODE: ClassVar[int]
    DETAIL: ClassVar[str]

    def __init__(
        self,
        detail: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(
            status_code=self.STATUS_CODE,
            detail=self.DETAIL if detail is None else detail,
            headers=headers,
        )


class InvalidCredentialsException(BaseAPIException):
    STATUS_CODE = status.HTTP_401_UNAUTHORIZED
    DETAIL = "Invalid or expired authentication credentials"

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthenticationUnavailableException(BaseAPIException):
    STATUS_CODE = status.HTTP_503_SERVICE_UNAVAILABLE
    DETAIL = "Authentication service unavailable"
