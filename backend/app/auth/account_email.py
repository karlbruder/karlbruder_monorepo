"""Read the current delivery address without mapping or modifying managed SupabaseAuth tables."""

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.core.mail import validate_email_address


class AccountEmailReadError(Exception):
    """The current account has no usable delivery address or lookup failed."""


class AccountEmailReader(Protocol):
    def read_email(self, user_id: UUID) -> str: ...


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
            raise AccountEmailReadError(
                "Current account email unavailable"
            ) from error
