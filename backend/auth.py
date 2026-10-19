import logging
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import (
    InvalidTokenError,
    PyJWKClientConnectionError,
    PyJWKClientError,
)
from pydantic import ValidationError

from exceptions import (
    AuthenticationUnavailableException,
    InvalidCredentialsException,
)
from models import User
from settings import (
    ALLOWED_JWT_ALGORITHMS,
    EXPECTED_AUDIENCE,
    EXPECTED_ROLE,
    JWKS_CACHE_LIFESPAN_SECONDS,
    JWKS_REQUEST_TIMEOUT_SECONDS,
    get_auth_settings,
)

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(
    auto_error=False,
    bearerFormat="JWT",
    description="Supabase access token",
)


def get_jwks_client() -> PyJWKClient:
    settings = get_auth_settings()
    return PyJWKClient(
        settings.jwks_url,
        cache_jwk_set=True,
        lifespan=JWKS_CACHE_LIFESPAN_SECONDS,
        timeout=JWKS_REQUEST_TIMEOUT_SECONDS,
    )


def _verify_user(credentials: HTTPAuthorizationCredentials) -> User:
    """Verify a supplied Supabase access token and return its claims."""

    if credentials.scheme.lower() != "bearer":
        raise InvalidCredentialsException()
    try:
        settings = get_auth_settings()
        signing_key = get_jwks_client().get_signing_key_from_jwt(
            credentials.credentials
        )
    except ValidationError as exc:
        logger.error("Supabase authentication configuration is invalid")
        raise AuthenticationUnavailableException() from exc
    except PyJWKClientConnectionError as exc:
        logger.warning("Unable to retrieve Supabase signing keys")
        raise AuthenticationUnavailableException() from exc
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise InvalidCredentialsException() from exc

    try:
        claims = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=ALLOWED_JWT_ALGORITHMS,
            audience=EXPECTED_AUDIENCE,
            issuer=settings.issuer,
            options={
                "require": ["exp", "iat", "iss", "aud", "sub", "role"],
            },
        )

        if claims["role"] != EXPECTED_ROLE:
            raise InvalidCredentialsException()

        return User(
            id=claims["sub"],
            email=claims.get("email") or None,
            user_metadata=claims.get("user_metadata") or {},
            app_metadata=claims.get("app_metadata") or {},
        )
    except HTTPException:
        raise
    except (InvalidTokenError, KeyError, TypeError, ValidationError) as exc:
        raise InvalidCredentialsException() from exc


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> User:
    """Require a verified Supabase user on a protected route."""

    if credentials is None:
        raise InvalidCredentialsException()
    return _verify_user(credentials)


def get_optional_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> User | None:
    """Allow guests while rejecting an invalid token when one is supplied."""

    if credentials is None:
        if request.headers.get("authorization") is not None:
            raise InvalidCredentialsException()
        return None
    return _verify_user(credentials)


def get_application_role(user: User | None) -> str:
    """Read only the trusted Auth-managed app_metadata role claim."""

    if user is None:
        return "guest"
    role = user.app_metadata.get("karlbruder_role")
    if role in ("regular_user", "guild_member", "admin"):
        return role
    return "regular_user"


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if get_application_role(current_user) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
