"""Add payments module tables for tournament inscription collection.

Revision ID: 20261102_0003
Revises: 20261102_0002
"""

from alembic import op
import sqlalchemy as sa

revision = "20261102_0003"
down_revision = "20261102_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pix_recipients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pix_key", sa.String(length=512), nullable=False),
        schema="public",
    )
    op.create_table(
        "tournament_inscription_payment_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "tournament_id",
            sa.Integer(),
            sa.ForeignKey("public.tournaments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pix_recipient_id",
            sa.Integer(),
            sa.ForeignKey("public.pix_recipients.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "tournament_id",
            name="uq_tournament_inscription_payment_configs_tournament",
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("tournament_inscription_payment_configs", schema="public")
    op.drop_table("pix_recipients", schema="public")
