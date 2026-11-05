"""Failures from the Supabase Auth Admin API."""

from app.auth.exceptions import AuthenticationError


class SupabaseAccountNotFoundError(AuthenticationError):
    def __init__(self) -> None:
        super().__init__("Account not found")


class SupabaseAdminUnavailableError(AuthenticationError):
    def __init__(self) -> None:
        super().__init__("Account management service unavailable")
