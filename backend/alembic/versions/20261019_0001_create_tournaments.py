"""Create generic tournament and signup tables.

Revision ID: 20261019_0001
Revises:
"""

from alembic import op
import sqlalchemy as sa

revision = "20261019_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tournaments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("modality", sa.String(length=80)),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True)),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("max_competitor_capacity", sa.Integer()),
        sa.Column("registration_opens_on", sa.Date()),
        sa.Column("registration_closes_on", sa.Date()),
        sa.Column(
            "new_registrations_closed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("payment_due_at", sa.DateTime(timezone=True)),
        sa.Column("inscription_fee_amount", sa.Numeric(12, 2)),
        sa.Column("location", sa.String(length=300)),
        sa.Column("schedule", sa.Text()),
        sa.Column("regulation", sa.Text()),
        sa.Column("regulation_version", sa.String(length=100)),
        sa.Column("terms_version", sa.String(length=100)),
        sa.Column("equipment_requirements", sa.Text()),
        sa.Column("cancellation_policy", sa.Text()),
        sa.Column("next_inscription_serial", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "max_competitor_capacity IS NULL OR max_competitor_capacity >= 0",
            name="ck_tournaments_capacity_nonnegative",
        ),
        sa.CheckConstraint(
            "inscription_fee_amount IS NULL OR inscription_fee_amount >= 0",
            name="ck_tournaments_fee_nonnegative",
        ),
        sa.CheckConstraint(
            "registration_opens_on IS NULL OR registration_closes_on IS NULL "
            "OR registration_opens_on <= registration_closes_on",
            name="ck_tournaments_registration_window_order",
        ),
        sa.CheckConstraint(
            "ends_at IS NULL OR ends_at >= starts_at",
            name="ck_tournaments_event_dates_order",
        ),
        sa.CheckConstraint(
            "next_inscription_serial BETWEEN 1 AND 1000000",
            name="ck_tournaments_next_serial_range",
        ),
        schema="public",
    )
    op.create_table(
        "tournament_signups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tournament_id", sa.Integer(), sa.ForeignKey("public.tournaments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("inscription_number", sa.String(length=50), nullable=False),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default=sa.text("'awaiting_payment'")
        ),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("social_name", sa.String(length=200)),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("document_type", sa.String(length=10), nullable=False),
        sa.Column("document_id", sa.String(length=100), nullable=False),
        sa.Column("document_id_normalized", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_normalized", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("city", sa.String(length=150), nullable=False),
        sa.Column("state", sa.String(length=150)),
        sa.Column("country", sa.String(length=150), nullable=False),
        sa.Column("school_name", sa.String(length=200)),
        sa.Column("responsible_instructor_name", sa.String(length=200)),
        sa.Column("hema_practice_duration", sa.String(length=100)),
        sa.Column("hema_practice_start_year", sa.Integer()),
        sa.Column("prior_tournaments_count", sa.Integer(), nullable=False),
        sa.Column("hema_ratings_ref", sa.String(length=300)),
        sa.Column("handedness", sa.String(length=16)),
        sa.Column("special_category_note", sa.Text()),
        sa.Column("emergency_contact_name", sa.String(length=200), nullable=False),
        sa.Column("emergency_contact_phone", sa.String(length=40), nullable=False),
        sa.Column("declares_required_equipment", sa.Boolean(), nullable=False),
        sa.Column("declares_physically_fit", sa.Boolean(), nullable=False),
        sa.Column("accepts_regulation", sa.Boolean(), nullable=False),
        sa.Column("accepts_data_processing", sa.Boolean(), nullable=False),
        sa.Column("acknowledges_inherent_risks", sa.Boolean(), nullable=False),
        sa.Column("accepts_cancellation_policy", sa.Boolean(), nullable=False),
        sa.Column("image_use_authorized", sa.Boolean(), nullable=False),
        sa.Column("accepted_terms_version", sa.String(length=100), nullable=False),
        sa.Column("accepted_regulation_version", sa.String(length=100), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acceptance_ip", sa.String(length=45), nullable=False),
        sa.Column("safety_note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('awaiting_payment', 'payment_in_review', 'confirmed', 'waitlist', 'cancelled')",
            name="ck_tournament_signups_status",
        ),
        sa.CheckConstraint(
            "document_type IN ('cpf', 'passport')", name="ck_tournament_signups_document_type"
        ),
        sa.CheckConstraint(
            "handedness IS NULL OR handedness IN ('right', 'left', 'ambidextrous')",
            name="ck_tournament_signups_handedness",
        ),
        sa.CheckConstraint(
            "prior_tournaments_count >= 0", name="ck_tournament_signups_prior_count"
        ),
        sa.CheckConstraint(
            "hema_practice_duration IS NOT NULL OR hema_practice_start_year IS NOT NULL",
            name="ck_tournament_signups_hema_experience",
        ),
        sa.CheckConstraint(
            "declares_required_equipment AND declares_physically_fit "
            "AND accepts_regulation AND accepts_data_processing "
            "AND acknowledges_inherent_risks AND accepts_cancellation_policy",
            name="ck_tournament_signups_required_declarations",
        ),
        sa.UniqueConstraint("inscription_number", name="uq_tournament_signups_inscription_number"),
        schema="public",
    )
    op.create_index("ix_tournament_signups_tournament_id", "tournament_signups", ["tournament_id"], schema="public")
    for name, key in (
        ("uq_tournament_signups_active_user", "user_id"),
        ("uq_tournament_signups_active_email", "email_normalized"),
        ("uq_tournament_signups_active_document", "document_id_normalized"),
    ):
        op.create_index(
            name,
            "tournament_signups",
            ["tournament_id", key],
            unique=True,
            postgresql_where=sa.text("status <> 'cancelled'"),
            schema="public",
        )


def downgrade() -> None:
    for name in (
        "uq_tournament_signups_active_document",
        "uq_tournament_signups_active_email",
        "uq_tournament_signups_active_user",
        "ix_tournament_signups_tournament_id",
    ):
        op.drop_index(name, table_name="tournament_signups", schema="public")
    op.drop_table("tournament_signups", schema="public")
    op.drop_table("tournaments", schema="public")
