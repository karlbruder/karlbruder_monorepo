"""Add an optional stable slug for exact tournament catalog lookup.

Revision ID: 20261030_0003
Revises: 20261019_0002
"""

from alembic import op
import sqlalchemy as sa

revision = "20261030_0003"
down_revision = "20261019_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tournaments", sa.Column("slug", sa.String(length=100), nullable=True), schema="public"
    )
    op.create_unique_constraint(
        "uq_tournaments_slug", "tournaments", ["slug"], schema="public"
    )


def downgrade() -> None:
    op.drop_constraint("uq_tournaments_slug", "tournaments", type_="unique", schema="public")
    op.drop_column("tournaments", "slug", schema="public")
