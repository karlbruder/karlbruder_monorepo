"""The initial migration can recreate the current registration schema."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.db.base import Base


def test_clean_baseline_rebuilds_registration_tables_and_separate_file_metadata(
    db_session,
):
    config = Config()
    config.set_main_option(
        "script_location", str(Path(__file__).resolve().parents[1] / "alembic")
    )
    connection = db_session.connection()
    config.attributes["connection"] = connection

    command.downgrade(config, "base")
    assert inspect(connection).get_table_names(schema="public") == ["alembic_version"]
    command.upgrade(config, "head")

    inspector = inspect(connection)
    tables = set(inspector.get_table_names(schema="public"))
    assert {
        "tournaments",
        "tournament_registrations",
        "tournament_registration_documents",
        "stored_files",
        "registration_acceptances",
        "archived_files",
        "payments",
        "refunds",
        "payment_proof_reviews",
        "registration_payments",
        "registration_refunds",
        "tournament_payment_settings",
    } <= tables
    tournament_columns = {
        column["name"]
        for column in inspector.get_columns("tournaments", schema="public")
    }
    assert "discipline" in tournament_columns
    document_columns = {
        column["name"]
        for column in inspector.get_columns(
            "tournament_registration_documents", schema="public"
        )
    }
    assert {
        "registration_id",
        "file_id",
        "document_type",
        "submitted_at",
    } <= document_columns
    assert document_columns.isdisjoint(
        {
            "storage_key",
            "original_file_name",
            "content_type",
            "size_bytes",
        }
    )
    constraints = inspector.get_check_constraints(
        "tournament_registration_documents", schema="public"
    )
    document_type = next(
        c
        for c in constraints
        if c["name"] == "ck_tournament_registration_documents_document_type"
    )
    assert "parental_consent_form" in document_type["sqltext"]

    registration_columns = {
        column["name"]
        for column in inspector.get_columns("tournament_registrations", schema="public")
    }
    assert registration_columns.isdisjoint(
        {"accepts_rules", "authorizes_image_use", "accepted_at", "accepted_from_ip"}
    )
    acceptance_columns = {
        column["name"]
        for column in inspector.get_columns("registration_acceptances", schema="public")
    }
    assert {
        "accepted_by_user_id",
        "accepts_rules",
        "authorizes_image_use",
        "content",
        "accepted_at",
        "accepted_from_ip",
        "rules_archive_id",
    } <= acceptance_columns

    for table in tables - {"alembic_version"}:
        ordered_columns = inspector.get_columns(table, schema="public")
        assert [column["name"] for column in ordered_columns[:3]] == ["id", "created_at", "updated_at"]
        assert list(Base.metadata.tables[f"public.{table}"].columns.keys())[:3] == ["id", "created_at", "updated_at"]
        columns = {column["name"]: column for column in ordered_columns}
        for name in ("created_at", "updated_at"):
            assert not columns[name]["nullable"]
            assert columns[name]["type"].timezone
