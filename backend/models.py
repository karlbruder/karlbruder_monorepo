from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    """The small, verified subset of Supabase claims exposed to routes."""

    model_config = ConfigDict(frozen=True)

    id: UUID
    email: str | None = None
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AnonymousUser:
    """An unauthenticated catalog visitor with no Supabase identity."""

    id: str = ""
    email: str = ""
    role: Literal["guest"] = "guest"
