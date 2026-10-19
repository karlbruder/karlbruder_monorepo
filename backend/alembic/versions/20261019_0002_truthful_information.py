"""Require a separate truthful-information declaration for new signups.

Revision ID: 20261019_0002
Revises: 20261019_0001

No default is provided: existing signups need a separately reviewed evidence
migration rather than being marked as having made this declaration.
"""

from alembic import op
import sqlalchemy as sa

revision = "20261019_0002"
down_revision = "20261019_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tournament_signups",
        sa.Column("declares_truthful_information", sa.Boolean(), nullable=False),
    )
    op.create_check_constraint(
        "ck_tournament_signups_truthfulness",
        "tournament_signups",
        "declares_truthful_information",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_tournament_signups_truthfulness", "tournament_signups", type_="check"
    )
    op.drop_column("tournament_signups", "declares_truthful_information")
