"""Add tournament signup file metadata table.

Revision ID: 20261102_0002
Revises: 20261019_0001
"""

from alembic import op
import sqlalchemy as sa

revision = "20261102_0002"
down_revision = "20261019_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tournament_signup_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "signup_id",
            sa.Integer(),
            sa.ForeignKey("public.tournament_signups.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("original_file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "kind IN ('parental_term', 'payment_proof')",
            name="ck_tournament_signup_files_kind",
        ),
        sa.CheckConstraint(
            "size_bytes BETWEEN 1 AND 10485760",
            name="ck_tournament_signup_files_size",
        ),
        sa.UniqueConstraint("storage_key", name="uq_tournament_signup_files_storage_key"),
        schema="public",
    )
    op.create_index(
        "ix_tournament_signup_files_signup_id",
        "tournament_signup_files",
        ["signup_id"],
        schema="public",
    )
    op.create_index(
        "uq_tournament_signup_files_one_parental_term",
        "tournament_signup_files",
        ["signup_id"],
        unique=True,
        postgresql_where=sa.text("kind = 'parental_term'"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_index(
        "uq_tournament_signup_files_one_parental_term",
        table_name="tournament_signup_files",
        schema="public",
    )
    op.drop_index(
        "ix_tournament_signup_files_signup_id",
        table_name="tournament_signup_files",
        schema="public",
    )
    op.drop_table("tournament_signup_files", schema="public")
