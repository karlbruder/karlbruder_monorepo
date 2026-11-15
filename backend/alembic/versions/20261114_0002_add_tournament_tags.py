"""Add tournament tag definitions and registration selections.

Revision ID: 20261114_0002
Revises: 20261114_0001
"""

from alembic import op
import sqlalchemy as sa

revision = "20261114_0002"
down_revision = "20261114_0001"
branch_labels = None
depends_on = None


def _base_columns():
    return [
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade():
    op.create_unique_constraint(
        "uq_tournament_registrations_id_tournament", "tournament_registrations",
        ["id", "tournament_id"], schema="public",
    )
    op.create_table(
        "tournament_tags", *_base_columns(),
        sa.Column("tournament_id", sa.Integer(), sa.ForeignKey("public.tournaments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("eligibility_description", sa.Text(), nullable=False),
        sa.UniqueConstraint("id", "tournament_id", name="uq_tournament_tags_id_tournament"),
        schema="public",
    )
    op.create_table(
        "registration_tags", *_base_columns(),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("tournament_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["registration_id", "tournament_id"], ["public.tournament_registrations.id", "public.tournament_registrations.tournament_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id", "tournament_id"], ["public.tournament_tags.id", "public.tournament_tags.tournament_id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("registration_id", "tag_id", name="uq_registration_tags_registration_tag"),
        schema="public",
    )


def downgrade():
    op.drop_table("registration_tags", schema="public")
    op.drop_table("tournament_tags", schema="public")
    op.drop_constraint("uq_tournament_registrations_id_tournament", "tournament_registrations", schema="public", type_="unique")
