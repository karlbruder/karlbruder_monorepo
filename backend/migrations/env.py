from logging.config import fileConfig
from typing import Any

from alembic import context

from database import Base, engine, require_env
from tournaments import models as tournament_models  # noqa: F401


PUBLIC_SCHEMA = "public"
ALEMBIC_VERSION_TABLE = "alembic_version"

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_name(
    name: str | None,
    type_: str,
    parent_names: dict[str, Any],
) -> bool:
    """Allow Alembic to inspect only application tables in public."""

    if type_ == "schema":
        return name in (None, PUBLIC_SCHEMA)

    if type_ == "table":
        if name == ALEMBIC_VERSION_TABLE:
            return False

        schema_name = parent_names.get("schema_name") or PUBLIC_SCHEMA
        table_key = f"{schema_name}.{name}"

        return table_key in target_metadata.tables

    return True


def run_migrations_offline() -> None:
    """Run migrations without opening a database connection."""

    context.configure(
        url=require_env("DATABASE_URL"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        include_name=include_name,
        version_table_schema=PUBLIC_SCHEMA,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using the application's database engine."""

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            include_name=include_name,
            version_table_schema=PUBLIC_SCHEMA,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()