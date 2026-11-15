"""Add Karlmart catalog and order records.

Revision ID: 20261114_0001
Revises: 20261103_0001
"""

from alembic import op
import sqlalchemy as sa

revision = "20261114_0001"
down_revision = "20261103_0001"
branch_labels = None
depends_on = None


def _base_columns():
    return [
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade():
    op.drop_column("tournaments", "registration_fee_amount", schema="public")
    op.create_table(
        "products", *_base_columns(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        schema="public",
    )
    op.create_table(
        "tournament_products", *_base_columns(),
        sa.Column("tournament_id", sa.Integer(), sa.ForeignKey("public.tournaments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("public.products.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("tournament_id", "product_id", name="uq_tournament_products_tournament_product"),
        schema="public",
    )
    op.create_table(
        "orders", *_base_columns(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("currency", sa.String(3), server_default="BRL", nullable=False),
        sa.CheckConstraint("currency = 'BRL'", name="ck_orders_currency_brl"),
        schema="public",
    )
    op.create_table(
        "prices", *_base_columns(),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("public.products.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="BRL", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.CheckConstraint("amount >= 0 AND amount <> 'NaN'::numeric", name="ck_prices_amount_nonnegative"),
        sa.CheckConstraint("currency = 'BRL'", name="ck_prices_currency_brl"),
        schema="public",
    )
    op.create_table(
        "order_items", *_base_columns(),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("public.orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("price_id", sa.Integer(), sa.ForeignKey("public.prices.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("product_name", sa.String(255), nullable=False),
        sa.Column("product_description", sa.Text(), nullable=False),
        sa.Column("unit_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="BRL", nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        sa.CheckConstraint("unit_amount >= 0 AND unit_amount <> 'NaN'::numeric", name="ck_order_items_unit_amount_nonnegative"),
        sa.CheckConstraint("currency = 'BRL'", name="ck_order_items_currency_brl"),
        schema="public",
    )
    op.add_column("tournament_registrations", sa.Column("tournament_product_id", sa.Integer(), nullable=False), schema="public")
    op.add_column("tournament_registrations", sa.Column("order_item_id", sa.Integer(), nullable=False), schema="public")
    op.create_foreign_key("fk_registration_tournament_product", "tournament_registrations", "tournament_products", ["tournament_product_id"], ["id"], source_schema="public", referent_schema="public", ondelete="RESTRICT")
    op.create_foreign_key("fk_registration_order_item", "tournament_registrations", "order_items", ["order_item_id"], ["id"], source_schema="public", referent_schema="public", ondelete="RESTRICT")
    op.create_unique_constraint("uq_registration_order_item", "tournament_registrations", ["order_item_id"], schema="public")
    op.add_column("payments", sa.Column("order_id", sa.Integer(), nullable=False), schema="public")
    op.create_foreign_key("fk_payment_order", "payments", "orders", ["order_id"], ["id"], source_schema="public", referent_schema="public", ondelete="RESTRICT")
    op.create_unique_constraint("uq_payments_order_id", "payments", ["order_id"], schema="public")
    op.add_column("refunds", sa.Column("due_on", sa.Date(), nullable=False), schema="public")
    op.drop_table("registration_refunds", schema="public")
    op.drop_table("registration_payments", schema="public")
    op.execute("DROP FUNCTION public.validate_registration_payment()")
    op.execute("DROP FUNCTION public.validate_registration_refund()")
    op.create_table(
        "payment_proof_payments", *_base_columns(),
        sa.Column("proof_review_id", sa.Integer(), sa.ForeignKey("public.payment_proof_reviews.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("public.payments.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("proof_review_id", name="uq_payment_proof_payments_review"),
        sa.UniqueConstraint("payment_id", name="uq_payment_proof_payments_payment"),
        schema="public",
    )
    op.execute("""
        CREATE FUNCTION public.validate_payment_proof_payment() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            PERFORM 1 FROM public.payment_proof_reviews r
            JOIN public.tournament_registration_documents d ON d.id = r.document_id
            JOIN public.tournament_registrations tr ON tr.id = d.registration_id
            JOIN public.order_items oi ON oi.id = tr.order_item_id
            JOIN public.payments p ON p.id = NEW.payment_id AND p.order_id = oi.order_id
            WHERE r.id = NEW.proof_review_id AND r.decision = 'approved'
              AND d.document_type = 'payment_proof'
            FOR SHARE OF r, d, tr, oi, p;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Payment requires approved proof for the same registration order' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("CREATE TRIGGER valid_payment_proof BEFORE INSERT ON public.payment_proof_payments FOR EACH ROW EXECUTE FUNCTION public.validate_payment_proof_payment()")
    op.execute("CREATE TRIGGER immutable_evidence BEFORE UPDATE OR DELETE ON public.payment_proof_payments FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation()")
    op.execute("""
        CREATE FUNCTION public.validate_tournament_refund() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            PERFORM 1 FROM public.payments WHERE id = NEW.payment_id FOR UPDATE;
            IF EXISTS (
                SELECT 1 FROM public.payments p
                JOIN public.order_items oi ON oi.order_id = p.order_id
                JOIN public.tournament_registrations tr ON tr.order_item_id = oi.id
                WHERE p.id = NEW.payment_id AND NEW.amount_owed <> p.amount_received
            ) THEN
                RAISE EXCEPTION 'Tournament refund must equal the received amount' USING ERRCODE = '23514';
            END IF;
            IF EXISTS (
                SELECT 1 FROM public.payments p
                JOIN public.order_items oi ON oi.order_id = p.order_id
                JOIN public.tournament_registrations tr ON tr.order_item_id = oi.id
                JOIN public.refunds r ON r.payment_id = p.id
                WHERE p.id = NEW.payment_id
            ) THEN
                RAISE EXCEPTION 'Tournament payment already has a refund' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("CREATE TRIGGER valid_tournament_refund BEFORE INSERT ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.validate_tournament_refund()")
    op.execute("""
        CREATE OR REPLACE FUNCTION public.protect_refund_obligation() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF ROW(NEW.payment_id, NEW.amount_owed, NEW.obligated_at, NEW.due_on)
                IS DISTINCT FROM ROW(OLD.payment_id, OLD.amount_owed, OLD.obligated_at, OLD.due_on) THEN
                RAISE EXCEPTION 'Refund obligation facts are immutable' USING ERRCODE = '23514';
            END IF;
            IF OLD.refund_status = 'completed' AND
                ROW(NEW.refund_status, NEW.completed_at, NEW.completed_by_user_id)
                IS DISTINCT FROM ROW(OLD.refund_status, OLD.completed_at, OLD.completed_by_user_id) THEN
                RAISE EXCEPTION 'Refund completion evidence is immutable' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("""
        CREATE FUNCTION public.validate_registration_order() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF TG_OP = 'UPDATE' AND
                ROW(NEW.tournament_id, NEW.tournament_product_id, NEW.order_item_id, NEW.user_id)
                IS DISTINCT FROM
                ROW(OLD.tournament_id, OLD.tournament_product_id, OLD.order_item_id, OLD.user_id) THEN
                RAISE EXCEPTION 'Registration purchase is immutable' USING ERRCODE = '23514';
            END IF;
            PERFORM 1 FROM public.tournament_products tp
            JOIN public.order_items oi ON oi.id = NEW.order_item_id
            JOIN public.prices pr ON pr.id = oi.price_id AND pr.product_id = tp.product_id
            JOIN public.orders o ON o.id = oi.order_id AND o.user_id = NEW.user_id
            WHERE tp.id = NEW.tournament_product_id AND tp.tournament_id = NEW.tournament_id
              AND oi.quantity = 1
            FOR SHARE OF tp;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Registration must match its tournament product and order' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("CREATE TRIGGER valid_registration_order BEFORE INSERT OR UPDATE ON public.tournament_registrations FOR EACH ROW EXECUTE FUNCTION public.validate_registration_order()")
    op.execute("""
        CREATE FUNCTION public.protect_order_owner() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
                RAISE EXCEPTION 'Order owner is immutable' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("CREATE TRIGGER immutable_order_owner BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.protect_order_owner()")
    op.execute("""
        CREATE FUNCTION public.protect_purchased_tournament_product() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF ROW(NEW.tournament_id, NEW.product_id)
                IS DISTINCT FROM ROW(OLD.tournament_id, OLD.product_id)
                AND EXISTS (SELECT 1 FROM public.tournament_registrations WHERE tournament_product_id = OLD.id) THEN
                RAISE EXCEPTION 'Purchased tournament product is immutable' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("CREATE TRIGGER immutable_purchased_tournament_product BEFORE UPDATE ON public.tournament_products FOR EACH ROW EXECUTE FUNCTION public.protect_purchased_tournament_product()")

    op.create_check_constraint(
        "ck_orders_status", "orders", "status IN ('pending', 'paid')", schema="public"
    )
    op.execute("""
        CREATE FUNCTION public.protect_purchased_price() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF ROW(NEW.product_id, NEW.amount, NEW.currency)
                IS DISTINCT FROM ROW(OLD.product_id, OLD.amount, OLD.currency)
                AND EXISTS (SELECT 1 FROM public.order_items WHERE price_id = OLD.id) THEN
                RAISE EXCEPTION 'Purchased price terms are immutable' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("""
        CREATE TRIGGER immutable_purchased_price BEFORE UPDATE ON public.prices
        FOR EACH ROW EXECUTE FUNCTION public.protect_purchased_price()
    """)
    op.execute("""
        CREATE FUNCTION public.lock_order_item_price() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            PERFORM 1 FROM public.prices
            WHERE id = NEW.price_id AND amount = NEW.unit_amount
                AND currency = NEW.currency
            FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Order item price must match its price record'
                    USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.execute("""
        CREATE TRIGGER valid_order_item_price BEFORE INSERT ON public.order_items
        FOR EACH ROW EXECUTE FUNCTION public.lock_order_item_price()
    """)
    op.execute("""
        CREATE TRIGGER immutable_order_item BEFORE UPDATE OR DELETE ON public.order_items
        FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation()
    """)



def downgrade():
    op.add_column("tournaments", sa.Column("registration_fee_amount", sa.Numeric(12, 2), nullable=True), schema="public")
    op.create_check_constraint("ck_tournaments_fee_nonnegative", "tournaments", "registration_fee_amount IS NULL OR registration_fee_amount >= 0", schema="public")
    op.execute("DROP TRIGGER immutable_purchased_tournament_product ON public.tournament_products")
    op.execute("DROP FUNCTION public.protect_purchased_tournament_product()")
    op.execute("DROP TRIGGER immutable_order_owner ON public.orders")
    op.execute("DROP FUNCTION public.protect_order_owner()")
    op.execute("DROP TRIGGER valid_registration_order ON public.tournament_registrations")
    op.execute("DROP FUNCTION public.validate_registration_order()")
    op.execute("DROP TRIGGER valid_tournament_refund ON public.refunds")
    op.execute("DROP FUNCTION public.validate_tournament_refund()")
    op.drop_table("payment_proof_payments", schema="public")
    op.execute("DROP FUNCTION public.validate_payment_proof_payment()")
    op.execute("""
        CREATE OR REPLACE FUNCTION public.protect_refund_obligation() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
            IF ROW(NEW.payment_id, NEW.amount_owed, NEW.obligated_at)
                IS DISTINCT FROM ROW(OLD.payment_id, OLD.amount_owed, OLD.obligated_at) THEN
                RAISE EXCEPTION 'Refund obligation facts are immutable' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END $$
    """)
    op.create_table(
        "registration_payments", *_base_columns(),
        sa.Column("registration_id", sa.Integer(), sa.ForeignKey("public.tournament_registrations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("proof_review_id", sa.Integer(), sa.ForeignKey("public.payment_proof_reviews.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("public.payments.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("registration_id", name="uq_registration_payments_registration"),
        sa.UniqueConstraint("proof_review_id", name="uq_registration_payments_review"),
        sa.UniqueConstraint("payment_id", name="uq_registration_payments_payment"), schema="public",
    )
    op.create_table(
        "registration_refunds", *_base_columns(),
        sa.Column("registration_payment_id", sa.Integer(), sa.ForeignKey("public.registration_payments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("refund_id", sa.Integer(), sa.ForeignKey("public.refunds.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("due_on", sa.Date(), nullable=False),
        sa.UniqueConstraint("registration_payment_id", name="uq_registration_refunds_registration_payment"),
        sa.UniqueConstraint("refund_id", name="uq_registration_refunds_refund"), schema="public",
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
    op.execute("CREATE TRIGGER valid_payment_review BEFORE INSERT ON public.registration_payments FOR EACH ROW EXECUTE FUNCTION public.validate_registration_payment()")
    op.execute("CREATE TRIGGER valid_refund_amount BEFORE INSERT OR UPDATE ON public.registration_refunds FOR EACH ROW EXECUTE FUNCTION public.validate_registration_refund()")
    for table_name in ("registration_payments", "registration_refunds"):
        op.execute(f"CREATE TRIGGER immutable_evidence BEFORE UPDATE OR DELETE ON public.{table_name} FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation()")
    op.execute("DROP TRIGGER immutable_order_item ON public.order_items")
    op.execute("DROP TRIGGER valid_order_item_price ON public.order_items")
    op.execute("DROP FUNCTION public.lock_order_item_price()")
    op.execute("DROP TRIGGER immutable_purchased_price ON public.prices")
    op.execute("DROP FUNCTION public.protect_purchased_price()")
    op.drop_constraint("ck_orders_status", "orders", schema="public", type_="check")

    op.drop_column("refunds", "due_on", schema="public")
    op.drop_constraint("uq_payments_order_id", "payments", schema="public", type_="unique")
    op.drop_constraint("fk_payment_order", "payments", schema="public", type_="foreignkey")
    op.drop_column("payments", "order_id", schema="public")
    op.drop_constraint("uq_registration_order_item", "tournament_registrations", schema="public", type_="unique")
    op.drop_constraint("fk_registration_order_item", "tournament_registrations", schema="public", type_="foreignkey")
    op.drop_constraint("fk_registration_tournament_product", "tournament_registrations", schema="public", type_="foreignkey")
    op.drop_column("tournament_registrations", "order_item_id", schema="public")
    op.drop_column("tournament_registrations", "tournament_product_id", schema="public")
    for table_name in ("order_items", "prices", "orders", "tournament_products", "products"):
        op.drop_table(table_name, schema="public")
