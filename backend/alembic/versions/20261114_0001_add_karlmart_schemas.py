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
    op.add_column("tournament_registrations", sa.Column("tournament_product_id", sa.Integer()), schema="public")
    op.add_column("tournament_registrations", sa.Column("order_item_id", sa.Integer()), schema="public")
    op.create_foreign_key("fk_registration_tournament_product", "tournament_registrations", "tournament_products", ["tournament_product_id"], ["id"], source_schema="public", referent_schema="public", ondelete="RESTRICT")
    op.create_foreign_key("fk_registration_order_item", "tournament_registrations", "order_items", ["order_item_id"], ["id"], source_schema="public", referent_schema="public", ondelete="RESTRICT")
    op.create_unique_constraint("uq_registration_order_item", "tournament_registrations", ["order_item_id"], schema="public")
    op.add_column("payments", sa.Column("order_id", sa.Integer()), schema="public")
    op.create_foreign_key("fk_payment_order", "payments", "orders", ["order_id"], ["id"], source_schema="public", referent_schema="public", ondelete="RESTRICT")
    op.add_column("refunds", sa.Column("due_on", sa.Date()), schema="public")


def downgrade():
    op.drop_column("refunds", "due_on", schema="public")
    op.drop_constraint("fk_payment_order", "payments", schema="public", type_="foreignkey")
    op.drop_column("payments", "order_id", schema="public")
    op.drop_constraint("uq_registration_order_item", "tournament_registrations", schema="public", type_="unique")
    op.drop_constraint("fk_registration_order_item", "tournament_registrations", schema="public", type_="foreignkey")
    op.drop_constraint("fk_registration_tournament_product", "tournament_registrations", schema="public", type_="foreignkey")
    op.drop_column("tournament_registrations", "order_item_id", schema="public")
    op.drop_column("tournament_registrations", "tournament_product_id", schema="public")
    for table_name in ("order_items", "prices", "orders", "tournament_products", "products"):
        op.drop_table(table_name, schema="public")
