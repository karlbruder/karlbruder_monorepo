"""FastAPI adapters for verified identities and route access."""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.exceptions import AdminAccessRequiredException, InvalidCredentialsException
from app.auth.models import AnonymousUser, User
from app.auth.supabase.roles import get_application_role
from app.auth.supabase.tokens import verify_user

bearer_scheme = HTTPBearer(
    auto_error=False,
    bearerFormat="JWT",
    description="Supabase access token",
)


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User | AnonymousUser:
    if credentials is None:
        if request.headers.get("authorization") is not None:
            raise InvalidCredentialsException()
        return AnonymousUser()
    if credentials.scheme.lower() != "bearer":
        raise InvalidCredentialsException()
    return verify_user(credentials.credentials)


def require_authenticated_user(
    current_user: Annotated[User | AnonymousUser, Depends(get_current_user)],
) -> User:
    if isinstance(current_user, AnonymousUser):
        raise InvalidCredentialsException()
    return current_user


AuthenticatedUser = Annotated[User, Depends(require_authenticated_user)]


def require_admin(
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> User:
    if get_application_role(current_user) != "admin":
        raise AdminAccessRequiredException()
    return current_user
