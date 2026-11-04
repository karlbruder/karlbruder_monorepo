"""Create the initial domain schema with shared archives, finances and domain associations.

Revision ID: 20261103_0001
Revises: none
"""

from alembic import op
import sqlalchemy as sa

revision = "20261103_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("amount_received", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("verified_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "amount_received >= 0 AND amount_received <> 'NaN'::numeric",
            name="ck_payments_amount_nonnegative",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "stored_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("original_file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("size_bytes >= 0", name="ck_stored_files_size_nonnegative"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key", name="uq_stored_files_storage_key"),
        schema="public",
    )
    op.create_table(
        "archived_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("final_url", sa.Text(), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_id"], ["public.stored_files.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "refunds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("amount_owed", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "refund_status",
            sa.String(length=32),
            server_default=sa.text("'awaiting_refund'"),
            nullable=False,
        ),
        sa.Column("obligated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_by_user_id", sa.Uuid(), nullable=True),
        sa.CheckConstraint(
            "(refund_status = 'awaiting_refund' AND completed_at IS NULL AND completed_by_user_id IS NULL) OR (refund_status = 'completed' AND completed_at IS NOT NULL AND completed_by_user_id IS NOT NULL)",
            name="ck_refunds_completion_evidence",
        ),
        sa.CheckConstraint(
            "amount_owed >= 0 AND amount_owed <> 'NaN'::numeric",
            name="ck_refunds_amount_nonnegative",
        ),
        sa.CheckConstraint(
            "refund_status IN ('awaiting_refund', 'completed')",
            name="ck_refunds_status",
        ),
        sa.CheckConstraint(
            "completed_at IS NULL OR completed_at >= obligated_at",
            name="ck_refunds_completion_order",
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"], ["public.payments.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "tournaments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("discipline", sa.String(length=80), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_internal", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("competitor_capacity", sa.Integer(), nullable=True),
        sa.Column("registration_opens_on", sa.Date(), nullable=True),
        sa.Column("registration_closes_on", sa.Date(), nullable=True),
        sa.Column(
            "is_registration_closed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("payment_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "registration_fee_amount", sa.Numeric(precision=12, scale=2), nullable=True
        ),
        sa.Column("location", sa.String(length=300), nullable=True),
        sa.Column("schedule", sa.Text(), nullable=True),
        sa.Column("rules_text", sa.Text(), nullable=True),
        sa.Column("rules_url", sa.Text(), nullable=True),
        sa.Column("rules_version", sa.String(length=100), nullable=True),
        sa.Column("terms_version", sa.String(length=100), nullable=True),
        sa.Column("equipment_requirements", sa.Text(), nullable=True),
        sa.Column("cancellation_policy_text", sa.Text(), nullable=True),
        sa.Column("cancellation_policy_url", sa.Text(), nullable=True),
        sa.Column("rules_archive_id", sa.Integer(), nullable=True),
        sa.Column("cancellation_policy_archive_id", sa.Integer(), nullable=True),
        sa.Column(
            "next_registration_number",
            sa.Integer(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "competitor_capacity IS NULL OR competitor_capacity >= 0",
            name="ck_tournaments_capacity_nonnegative",
        ),
        sa.CheckConstraint(
            "ends_at IS NULL OR ends_at >= starts_at",
            name="ck_tournaments_event_dates_order",
        ),
        sa.CheckConstraint(
            "next_registration_number BETWEEN 1 AND 1000000",
            name="ck_tournaments_next_serial_range",
        ),
        sa.CheckConstraint(
            "registration_fee_amount IS NULL OR registration_fee_amount >= 0",
            name="ck_tournaments_fee_nonnegative",
        ),
        sa.CheckConstraint(
            "registration_opens_on IS NULL OR registration_closes_on IS NULL OR registration_opens_on <= registration_closes_on",
            name="ck_tournaments_registration_window_order",
        ),
        sa.ForeignKeyConstraint(
            ["cancellation_policy_archive_id"],
            ["public.archived_files.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["rules_archive_id"], ["public.archived_files.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_tournaments_slug"),
        schema="public",
    )
    op.create_table(
        "tournament_payment_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tournament_id", sa.Integer(), nullable=False),
        sa.Column("pix_key", sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(
            ["tournament_id"], ["public.tournaments.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tournament_id", name="uq_tournament_payment_settings_tournament"
        ),
        schema="public",
    )
    op.create_table(
        "tournament_registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tournament_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("registration_number", sa.String(length=50), nullable=False),
        sa.Column(
            "registration_status",
            sa.String(length=32),
            server_default=sa.text("'awaiting_payment'"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("social_name", sa.String(length=200), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("identity_document_type", sa.String(length=10), nullable=False),
        sa.Column("identity_document_number", sa.String(length=100), nullable=False),
        sa.Column(
            "identity_document_number_normalized", sa.String(length=100), nullable=False
        ),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_normalized", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("city", sa.String(length=150), nullable=False),
        sa.Column("state_or_province", sa.String(length=150), nullable=True),
        sa.Column("country", sa.String(length=150), nullable=False),
        sa.Column("school_or_team_name", sa.String(length=200), nullable=True),
        sa.Column("instructor_name", sa.String(length=200), nullable=True),
        sa.Column("hema_experience_description", sa.String(length=100), nullable=True),
        sa.Column("hema_started_year", sa.Integer(), nullable=True),
        sa.Column("previous_tournament_count", sa.Integer(), nullable=False),
        sa.Column("hema_ratings_reference", sa.String(length=300), nullable=True),
        sa.Column("handedness", sa.String(length=16), nullable=True),
        sa.Column("category_or_eligibility_note", sa.Text(), nullable=True),
        sa.Column("emergency_contact_name", sa.String(length=200), nullable=False),
        sa.Column("emergency_contact_phone", sa.String(length=40), nullable=False),
        sa.Column("staff_safety_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "handedness IS NULL OR handedness IN ('right', 'left', 'ambidextrous')",
            name="ck_tournament_registrations_handedness",
        ),
        sa.CheckConstraint(
            "identity_document_type IN ('cpf', 'passport')",
            name="ck_tournament_registrations_identity_document_type",
        ),
        sa.CheckConstraint(
            "registration_status IN ('awaiting_payment', 'payment_in_review', 'confirmed', 'waitlist', 'cancelled')",
            name="ck_tournament_registrations_status",
        ),
        sa.CheckConstraint(
            "hema_experience_description IS NOT NULL OR hema_started_year IS NOT NULL",
            name="ck_tournament_registrations_hema_experience",
        ),
        sa.CheckConstraint(
            "previous_tournament_count >= 0",
            name="ck_tournament_registrations_prior_count",
        ),
        sa.ForeignKeyConstraint(
            ["tournament_id"], ["public.tournaments.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "registration_number",
            name="uq_tournament_registrations_registration_number",
        ),
        schema="public",
    )
    op.create_index(
        "ix_tournament_registrations_tournament_id",
        "tournament_registrations",
        ["tournament_id"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "uq_tournament_registrations_active_document",
        "tournament_registrations",
        ["tournament_id", "identity_document_number_normalized"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("registration_status <> 'cancelled'"),
        sqlite_where=sa.text("registration_status <> 'cancelled'"),
    )
    op.create_index(
        "uq_tournament_registrations_active_email",
        "tournament_registrations",
        ["tournament_id", "email_normalized"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("registration_status <> 'cancelled'"),
        sqlite_where=sa.text("registration_status <> 'cancelled'"),
    )
    op.create_index(
        "uq_tournament_registrations_active_user",
        "tournament_registrations",
        ["tournament_id", "user_id"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("registration_status <> 'cancelled'"),
        sqlite_where=sa.text("registration_status <> 'cancelled'"),
    )
    op.create_table(
        "registration_acceptances",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("accepted_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("declares_truthful_information", sa.Boolean(), nullable=False),
        sa.Column("declares_has_required_equipment", sa.Boolean(), nullable=False),
        sa.Column("declares_physically_fit", sa.Boolean(), nullable=False),
        sa.Column("accepts_rules", sa.Boolean(), nullable=False),
        sa.Column("accepts_data_processing", sa.Boolean(), nullable=False),
        sa.Column("acknowledges_inherent_risks", sa.Boolean(), nullable=False),
        sa.Column("accepts_cancellation_policy", sa.Boolean(), nullable=False),
        sa.Column("authorizes_image_use", sa.Boolean(), nullable=False),
        sa.Column("accepted_terms_version", sa.String(length=100), nullable=False),
        sa.Column("accepted_rules_version", sa.String(length=100), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_from_ip", sa.String(length=45), nullable=False),
        sa.Column("language", sa.String(length=2), nullable=False),
        sa.Column("content_digest", sa.String(length=64), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("rules_archive_id", sa.Integer(), nullable=True),
        sa.Column("cancellation_policy_archive_id", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "language IN ('pt', 'en')", name="ck_registration_acceptances_language"
        ),
        sa.CheckConstraint(
            "declares_truthful_information AND declares_has_required_equipment AND declares_physically_fit AND accepts_rules AND accepts_data_processing AND acknowledges_inherent_risks AND accepts_cancellation_policy",
            name="ck_registration_acceptances_required_choices",
        ),
        sa.ForeignKeyConstraint(
            ["cancellation_policy_archive_id"],
            ["public.archived_files.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["registration_id"],
            ["public.tournament_registrations.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["rules_archive_id"], ["public.archived_files.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "tournament_registration_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=32), nullable=False),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "document_type IN ('parental_consent_form', 'payment_proof')",
            name="ck_tournament_registration_documents_document_type",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"], ["public.stored_files.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["registration_id"],
            ["public.tournament_registrations.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "file_id", name="uq_tournament_registration_documents_file"
        ),
        schema="public",
    )
    op.create_index(
        "ix_tournament_registration_documents_registration_id",
        "tournament_registration_documents",
        ["registration_id"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "uq_tournament_registration_documents_one_parental_consent_form",
        "tournament_registration_documents",
        ["registration_id"],
        unique=True,
        schema="public",
        postgresql_where=sa.text("document_type = 'parental_consent_form'"),
    )
    op.create_table(
        "payment_proof_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(length=16), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "decision <> 'rejected' OR (rejection_reason IS NOT NULL AND rejection_reason ~ '[^[:space:]]')",
            name="ck_payment_proof_reviews_rejection_reason",
        ),
        sa.CheckConstraint(
            "decision IN ('approved', 'rejected')",
            name="ck_payment_proof_reviews_decision",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["public.tournament_registration_documents.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "registration_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("proof_review_id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["payment_id"], ["public.payments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["proof_review_id"],
            ["public.payment_proof_reviews.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["registration_id"],
            ["public.tournament_registrations.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("payment_id", name="uq_registration_payments_payment"),
        sa.UniqueConstraint("proof_review_id", name="uq_registration_payments_review"),
        sa.UniqueConstraint(
            "registration_id", name="uq_registration_payments_registration"
        ),
        schema="public",
    )
    op.create_table(
        "registration_refunds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_payment_id", sa.Integer(), nullable=False),
        sa.Column("refund_id", sa.Integer(), nullable=False),
        sa.Column("due_on", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(
            ["refund_id"], ["public.refunds.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["registration_payment_id"],
            ["public.registration_payments.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("refund_id", name="uq_registration_refunds_refund"),
        sa.UniqueConstraint(
            "registration_payment_id",
            name="uq_registration_refunds_registration_payment",
        ),
        schema="public",
    )
    op.execute(
        """
        CREATE FUNCTION public.reject_evidence_mutation() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            RAISE EXCEPTION 'Recorded evidence is immutable' USING ERRCODE = '23514';
        END $$
    """
    )
    for table in ("registration_acceptances", "archived_files"):
        op.execute(
            f"CREATE TRIGGER immutable_evidence BEFORE UPDATE OR DELETE ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation()"
        )
    op.execute(
        """
        CREATE FUNCTION public.protect_archived_file_metadata() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF EXISTS (SELECT 1 FROM public.archived_files WHERE file_id = OLD.id) THEN
                RAISE EXCEPTION 'Archived file metadata is immutable' USING ERRCODE = '23514';
            END IF;
            IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER immutable_archived_file BEFORE UPDATE OR DELETE ON public.stored_files FOR EACH ROW EXECUTE FUNCTION public.protect_archived_file_metadata()"
    )
    op.execute(
        """
        CREATE FUNCTION public.validate_payment_proof_review() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            PERFORM 1 FROM public.tournament_registration_documents d
                JOIN public.stored_files f ON f.id = d.file_id
                WHERE d.id = NEW.document_id AND d.document_type = 'payment_proof'
                FOR SHARE OF d, f;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Review must identify a submitted payment proof' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER valid_proof_review BEFORE INSERT ON public.payment_proof_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_payment_proof_review()"
    )
    op.execute(
        """
        CREATE FUNCTION public.validate_registration_payment() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            PERFORM 1 FROM public.payment_proof_reviews r
                JOIN public.tournament_registration_documents d ON d.id = r.document_id
                WHERE r.id = NEW.proof_review_id AND r.decision = 'approved'
                    AND d.registration_id = NEW.registration_id AND d.document_type = 'payment_proof'
                FOR SHARE OF r, d;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Payment requires an approved proof review for the same registration' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER valid_payment_review BEFORE INSERT ON public.registration_payments FOR EACH ROW EXECUTE FUNCTION public.validate_registration_payment()"
    )
    op.execute(
        """
        CREATE FUNCTION public.validate_registration_refund() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            PERFORM 1 FROM public.registration_payments rp
                JOIN public.payments p ON p.id = rp.payment_id
                JOIN public.refunds f ON f.id = NEW.refund_id
                WHERE rp.id = NEW.registration_payment_id
                    AND f.payment_id = p.id AND f.amount_owed = p.amount_received
                FOR SHARE OF rp, p, f;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Tournament refund must match its registration payment and exact amount received' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER valid_refund_amount BEFORE INSERT OR UPDATE ON public.registration_refunds FOR EACH ROW EXECUTE FUNCTION public.validate_registration_refund()"
    )
    op.execute(
        """
        CREATE FUNCTION public.protect_reviewed_document() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF EXISTS (SELECT 1 FROM public.payment_proof_reviews WHERE document_id = OLD.id) THEN
                RAISE EXCEPTION 'Reviewed proof evidence is immutable' USING ERRCODE = '23514';
            END IF;
            IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER immutable_reviewed_document BEFORE UPDATE OR DELETE ON public.tournament_registration_documents FOR EACH ROW EXECUTE FUNCTION public.protect_reviewed_document()"
    )
    op.execute(
        """
        CREATE FUNCTION public.protect_reviewed_proof_file() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM public.tournament_registration_documents d
                JOIN public.payment_proof_reviews r ON r.document_id = d.id
                WHERE d.file_id = OLD.id
            ) THEN
                RAISE EXCEPTION 'Reviewed proof file metadata is immutable' USING ERRCODE = '23514';
            END IF;
            IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER immutable_reviewed_proof_file BEFORE UPDATE OR DELETE ON public.stored_files FOR EACH ROW EXECUTE FUNCTION public.protect_reviewed_proof_file()"
    )
    for table in (
        "payment_proof_reviews",
        "registration_payments",
        "registration_refunds",
        "payments",
    ):
        op.execute(
            f"CREATE TRIGGER immutable_evidence BEFORE UPDATE OR DELETE ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation()"
        )
    op.execute(
        """
        CREATE FUNCTION public.protect_refund_obligation() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF ROW(NEW.payment_id, NEW.amount_owed, NEW.obligated_at)
                IS DISTINCT FROM ROW(OLD.payment_id, OLD.amount_owed, OLD.obligated_at) THEN
                RAISE EXCEPTION 'Refund obligation facts are immutable' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """
    )
    op.execute(
        "CREATE TRIGGER immutable_refund_obligation BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.protect_refund_obligation()"
    )


def downgrade() -> None:
    op.drop_table("registration_refunds", schema="public")
    op.drop_table("registration_payments", schema="public")
    op.drop_table("payment_proof_reviews", schema="public")
    op.drop_index(
        "uq_tournament_registration_documents_one_parental_consent_form",
        table_name="tournament_registration_documents",
        schema="public",
        postgresql_where=sa.text("document_type = 'parental_consent_form'"),
    )
    op.drop_index(
        "ix_tournament_registration_documents_registration_id",
        table_name="tournament_registration_documents",
        schema="public",
    )
    op.drop_table("tournament_registration_documents", schema="public")
    op.drop_table("registration_acceptances", schema="public")
    op.drop_index(
        "uq_tournament_registrations_active_user",
        table_name="tournament_registrations",
        schema="public",
        postgresql_where=sa.text("registration_status <> 'cancelled'"),
        sqlite_where=sa.text("registration_status <> 'cancelled'"),
    )
    op.drop_index(
        "uq_tournament_registrations_active_email",
        table_name="tournament_registrations",
        schema="public",
        postgresql_where=sa.text("registration_status <> 'cancelled'"),
        sqlite_where=sa.text("registration_status <> 'cancelled'"),
    )
    op.drop_index(
        "uq_tournament_registrations_active_document",
        table_name="tournament_registrations",
        schema="public",
        postgresql_where=sa.text("registration_status <> 'cancelled'"),
        sqlite_where=sa.text("registration_status <> 'cancelled'"),
    )
    op.drop_index(
        "ix_tournament_registrations_tournament_id",
        table_name="tournament_registrations",
        schema="public",
    )
    op.drop_table("tournament_registrations", schema="public")
    op.drop_table("tournament_payment_settings", schema="public")
    op.drop_table("tournaments", schema="public")
    op.drop_table("refunds", schema="public")
    op.drop_table("archived_files", schema="public")
    op.drop_table("stored_files", schema="public")
    op.drop_table("payments", schema="public")
    op.execute("DROP FUNCTION public.reject_evidence_mutation()")
    op.execute("DROP FUNCTION public.protect_archived_file_metadata()")
    op.execute("DROP FUNCTION public.validate_payment_proof_review()")
    op.execute("DROP FUNCTION public.validate_registration_payment()")
    op.execute("DROP FUNCTION public.validate_registration_refund()")
    op.execute("DROP FUNCTION public.protect_reviewed_document()")
    op.execute("DROP FUNCTION public.protect_reviewed_proof_file()")
    op.execute("DROP FUNCTION public.protect_refund_obligation()")
