"""Associate registration acceptances with published policy versions.

Revision ID: 20261117_0002
Revises: 20261117_0001
"""

from alembic import op
import sqlalchemy as sa

revision = "20261117_0002"
down_revision = "20261117_0001"
branch_labels = None
depends_on = None


def upgrade():
    for column in ("rules_version_id", "cancellation_policy_version_id"):
        op.add_column(
            "registration_acceptances",
            sa.Column(column, sa.Integer(), nullable=True),
            schema="public",
        )
        op.create_foreign_key(
            f"fk_registration_acceptances_{column}",
            "registration_acceptances",
            "tournament_document_versions",
            [column],
            ["id"],
            source_schema="public",
            referent_schema="public",
            ondelete="RESTRICT",
        )


def downgrade():
    for column in ("cancellation_policy_version_id", "rules_version_id"):
        op.drop_constraint(
            f"fk_registration_acceptances_{column}",
            "registration_acceptances",
            schema="public",
            type_="foreignkey",
        )
        op.drop_column("registration_acceptances", column, schema="public")
