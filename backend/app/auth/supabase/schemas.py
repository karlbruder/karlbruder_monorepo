from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

ApplicationRole = Literal["regular_user", "guild_member", "admin"]


class StaffAccount(BaseModel):
    id: UUID
    email: str | None
    role: ApplicationRole


class StaffAccountPage(BaseModel):
    users: list[StaffAccount]
    next_page: int | None


class RoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: ApplicationRole
