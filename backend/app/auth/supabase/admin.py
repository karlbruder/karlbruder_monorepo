"""Server-side access to Supabase Auth account administration."""

from typing import Any
from uuid import UUID

import httpx
from pydantic import BaseModel, ValidationError

from app.auth.models import User
from app.auth.supabase.exceptions import (
    SupabaseAccountNotFoundError,
    SupabaseAdminUnavailableError,
)
from app.auth.supabase.schemas import ApplicationRole
from config import settings


class _ProviderPage(BaseModel):
    users: list[User]


def admin_client() -> httpx.Client:
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    return httpx.Client(
        base_url=f"{settings.issuer}/admin/",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        timeout=5,
    )


def _request(
    client: httpx.Client,
    method: str,
    path: str,
    **kwargs: Any,
) -> httpx.Response:
    try:
        response = client.request(method, path, **kwargs)
        if response.status_code == 404 and path != "users":
            raise SupabaseAccountNotFoundError()
        return response.raise_for_status()
    except httpx.HTTPError:
        raise SupabaseAdminUnavailableError() from None


def list_users(
    client: httpx.Client, page: int, per_page: int
) -> tuple[list[User], int | None]:
    response = _request(
        client, "GET", "users", params={"page": page, "per_page": per_page}
    )
    try:
        users = _ProviderPage.model_validate_json(response.content).users
    except ValidationError:
        raise SupabaseAdminUnavailableError() from None
    return users, page + 1 if "next" in response.links else None


def get_user(client: httpx.Client, user_id: UUID) -> User:
    return _read_user(_request(client, "GET", f"users/{user_id}"), user_id)


def update_role(client: httpx.Client, user_id: UUID, role: ApplicationRole) -> User:
    # Supabase merges supplied app metadata keys into the account's metadata.
    response = _request(
        client,
        "PUT",
        f"users/{user_id}",
        json={"app_metadata": {"karlbruder_role": role}},
    )
    return _read_user(response, user_id)


def _read_user(response: httpx.Response, user_id: UUID) -> User:
    try:
        user = User.model_validate_json(response.content)
    except ValidationError:
        raise SupabaseAdminUnavailableError() from None
    if user.id != user_id:
        raise SupabaseAdminUnavailableError()
    return user
