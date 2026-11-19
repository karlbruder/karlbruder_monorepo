"""Record accepted policy versions and drop legacy tournament policy fields.

Revision ID: 20261117_0002
Revises: 20261117_0001
"""

from alembic import op
import sqlalchemy as sa

revision = "20261117_0002"
down_revision = "20261117_0001"
branch_labels = None
depends_on = None

LEGACY_POLICY_COLUMNS = (
    "rules_text",
    "rules_url",
    "cancellation_policy_text",
    "cancellation_policy_url",
)


def upgrade() -> None:
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

    for column in LEGACY_POLICY_COLUMNS:
        op.drop_column("tournaments", column, schema="public")


def downgrade() -> None:
    for column in LEGACY_POLICY_COLUMNS:
        op.add_column(
            "tournaments", sa.Column(column, sa.Text(), nullable=True), schema="public"
        )
    for column in ("cancellation_policy_version_id", "rules_version_id"):
        op.drop_constraint(
            f"fk_registration_acceptances_{column}",
            "registration_acceptances",
            schema="public",
            type_="foreignkey",
        )
        op.drop_column("registration_acceptances", column, schema="public")
