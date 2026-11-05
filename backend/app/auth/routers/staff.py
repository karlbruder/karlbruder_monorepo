from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_admin
from app.auth.models import User
from app.auth.supabase.schemas import RoleUpdate, StaffAccount, StaffAccountPage
from app.auth.supabase.services import change_account_role, list_staff_accounts

router = APIRouter(prefix="/api/staff")


@router.get("/users", dependencies=[Depends(require_admin)])
def list_accounts(
    page: Annotated[int, Query(ge=1, le=2_147_483_647)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 50,
) -> StaffAccountPage:
    return list_staff_accounts(page, per_page)


@router.patch("/users/{user_id}")
def update_account_role(
    user_id: UUID,
    update: RoleUpdate,
    actor: Annotated[User, Depends(require_admin)],
) -> StaffAccount:
    return change_account_role(actor, user_id, update.role)
