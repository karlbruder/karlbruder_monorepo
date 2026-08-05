from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CurrentUser(BaseModel):
    """The small, verified subset of Supabase claims exposed to routes."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    email: str | None = None
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)
