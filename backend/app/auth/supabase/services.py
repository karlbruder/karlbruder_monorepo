"""Account directory and role updates for guild staff."""

import logging
from uuid import UUID

from app.auth.models import User
from app.auth.supabase import admin
from app.auth.supabase.exceptions import SupabaseAdminUnavailableError
from app.auth.supabase.roles import get_application_role
from app.auth.supabase.schemas import ApplicationRole, StaffAccount, StaffAccountPage

logger = logging.getLogger(__name__)


def _staff_account(user: User) -> StaffAccount:
    return StaffAccount(
        id=user.id, email=user.email or None, role=get_application_role(user)
    )


def list_staff_accounts(page: int, per_page: int) -> StaffAccountPage:
    with admin.admin_client() as client:
        users, next_page = admin.list_users(client, page, per_page)
    return StaffAccountPage(
        users=[_staff_account(user) for user in users], next_page=next_page
    )


def change_account_role(
    actor: User, user_id: UUID, role: ApplicationRole
) -> StaffAccount:
    with admin.admin_client() as client:
        previous = admin.get_user(client, user_id)
        updated = admin.update_role(client, user_id, role)

    if updated.app_metadata.get("karlbruder_role") != role:
        raise SupabaseAdminUnavailableError()
    if role == "admin" and get_application_role(previous) != "admin":
        logger.warning(
            "Application admin promotion actor=%s target=%s", actor.id, user_id
        )
    return _staff_account(updated)
