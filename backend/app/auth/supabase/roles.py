from app.auth.models import AnonymousUser, User


def get_application_role(user: User | AnonymousUser) -> str:
    """Resolve the application role from trusted Supabase app metadata."""

    if isinstance(user, AnonymousUser):
        return "guest"
    role = user.app_metadata.get("karlbruder_role")
    if role in ("regular_user", "guild_member", "admin"):
        return role
    return "regular_user"
