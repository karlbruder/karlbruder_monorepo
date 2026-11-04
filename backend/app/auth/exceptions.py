"""Authentication failures independent of HTTP transport."""


class AuthenticationError(Exception):
    pass


class InvalidCredentialsException(AuthenticationError):
    def __init__(self) -> None:
        super().__init__("Invalid or expired authentication credentials")


class AuthenticationUnavailableException(AuthenticationError):
    def __init__(self) -> None:
        super().__init__("Authentication service unavailable")


class AdminAccessRequiredException(AuthenticationError):
    def __init__(self) -> None:
        super().__init__("Admin access required")
