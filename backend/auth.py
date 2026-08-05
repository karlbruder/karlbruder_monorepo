import logging
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
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


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> User:
    """Verify a Supabase access token and return its user identity claims."""

    if credentials is None or credentials.scheme.lower() != "bearer":
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
