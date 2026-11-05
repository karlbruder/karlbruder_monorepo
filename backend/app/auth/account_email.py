"""Current account email lookup contract."""

from typing import Protocol
from uuid import UUID


class AccountEmailReadError(Exception):
    """The current account has no usable delivery address or lookup failed."""


class AccountEmailReader(Protocol):
    def read_email(self, user_id: UUID) -> str: ...
