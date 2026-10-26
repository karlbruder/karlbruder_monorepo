"""Alembic migration environment for Karlbrüder public domain tables."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

from database import Base, get_database_url
from tournaments import models  # noqa: F401 - register domain metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_name(name, type_, parent_names):
    """Autogenerate only the domain schema, never Supabase-managed schemas."""

    if type_ == "schema":
        return name == "public"
    return type_ != "table" or name != "alembic_version"


def run_migrations_offline() -> None:
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        include_name=include_name,
        version_table_schema="public",
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    supplied_connection = config.attributes.get("connection")
    if supplied_connection is not None:
        context.configure(
            connection=supplied_connection,
            target_metadata=target_metadata,
            include_schemas=True,
            include_name=include_name,
            version_table_schema="public",
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    url = get_database_url()
    # Reflect public as an explicit schema during autogenerate. PostgreSQL
    # otherwise reports public as the default (None), unlike our metadata.
    connect_args = (
        {"options": "-csearch_path=pg_catalog"}
        if make_url(url).get_backend_name() == "postgresql"
        else {}
    )
    migration_engine = create_engine(url, connect_args=connect_args)
    try:
        with migration_engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                include_schemas=True,
                include_name=include_name,
                version_table_schema="public",
                compare_type=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        migration_engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
