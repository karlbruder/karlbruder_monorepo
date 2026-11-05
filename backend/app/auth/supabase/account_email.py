"""Read the current delivery address from the managed Supabase Auth database."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.auth.account_email import AccountEmailReadError
from app.core.mail import validate_email_address


@dataclass(frozen=True)
class SupabaseAccountEmailReader:
    engine: Engine

    def read_email(self, user_id: UUID) -> str:
        try:
            with self.engine.connect() as connection:
                email = connection.execute(
                    text("SELECT email FROM auth.users WHERE id = :user_id"),
                    {"user_id": user_id},
                ).scalar_one_or_none()
            if not isinstance(email, str):
                raise AccountEmailReadError("Current account email unavailable")
            return validate_email_address(email)
        except (SQLAlchemyError, ValueError) as error:
            raise AccountEmailReadError("Current account email unavailable") from error
