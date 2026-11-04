import logging

import jwt
from jwt import PyJWKClient
from jwt.exceptions import (
    InvalidTokenError,
    PyJWKClientConnectionError,
    PyJWKClientError,
)
from pydantic import ValidationError

from app.auth.exceptions import (
    AuthenticationUnavailableException,
    InvalidCredentialsException,
)
from app.auth.models import AnonymousUser, User
from config import (
    ALLOWED_JWT_ALGORITHMS,
    EXPECTED_AUDIENCE,
    EXPECTED_ROLE,
    JWKS_CACHE_LIFESPAN_SECONDS,
    JWKS_REQUEST_TIMEOUT_SECONDS,
    settings,
)

logger = logging.getLogger(__name__)


def get_jwks_client() -> PyJWKClient:
    return PyJWKClient(
        settings.jwks_url,
        cache_jwk_set=True,
        lifespan=JWKS_CACHE_LIFESPAN_SECONDS,
        timeout=JWKS_REQUEST_TIMEOUT_SECONDS,
    )


def verify_user(access_token: str) -> User:
    """Verify a supplied Supabase access token and return its claims."""

    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(access_token)
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
            access_token,
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
    except (InvalidTokenError, KeyError, TypeError, ValidationError) as exc:
        raise InvalidCredentialsException() from exc


def get_application_role(user: User | AnonymousUser) -> str:
    """Read only the trusted Auth-managed app_metadata role claim."""

    if isinstance(user, AnonymousUser):
        return "guest"
    role = user.app_metadata.get("karlbruder_role")
    if role in ("regular_user", "guild_member", "admin"):
        return role
    return "regular_user"
