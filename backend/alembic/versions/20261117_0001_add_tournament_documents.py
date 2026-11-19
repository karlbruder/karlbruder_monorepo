"""Add tournament documents and published versions.

Revision ID: 20261117_0001
Revises: 20261114_0002
"""
from alembic import op
import sqlalchemy as sa

revision = "20261117_0001"
down_revision = "20261114_0002"
branch_labels = None
depends_on = None


def _base_columns():
    return [
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade():
    op.create_table(
        "tournament_documents", *_base_columns(),
        sa.Column("tournament_id", sa.Integer(), sa.ForeignKey("public.tournaments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(32)),
        sa.Column("title", sa.String(200), nullable=False),
        sa.UniqueConstraint("tournament_id", "purpose", name="uq_tournament_document_purpose"),
        sa.CheckConstraint("purpose IS NULL OR purpose IN ('rules', 'cancellation_policy')", name="ck_tournament_document_purpose"),
        schema="public",
    )
    op.create_table(
        "tournament_document_versions", *_base_columns(),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("public.tournament_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("archive_id", sa.Integer(), sa.ForeignKey("public.archived_files.id", ondelete="RESTRICT"), nullable=False),
        schema="public",
    )


def downgrade():
    op.drop_table("tournament_document_versions", schema="public")
    op.drop_table("tournament_documents", schema="public")
