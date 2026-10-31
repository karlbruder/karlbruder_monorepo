# Domain migration notes

**Created**: 2026-10-26
**Last updated**: 2026-10-31

Alembic manages Karlbrüder domain tables in the database selected by
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The migrations use PostgreSQL's `public` schema and do not create
or modify Supabase-managed `auth` objects. Tournament table names, their foreign
key, indexes, and Alembic version state are explicitly qualified as `public`,
even when another schema comes first in the connection's `search_path`. Verify
the target database before a controlled deployment, then run
`poetry run alembic upgrade head` and
`poetry run alembic current` from `backend/`.

For local Compose, start PostgreSQL with `docker compose up -d db` from the
repository root. The backend image also contains Alembic, so a built and running
backend can apply migrations with `docker compose exec -T backend alembic upgrade head`.
In production, point `DB_HOST` and `DB_NAME` at the intended Supabase PostgreSQL database
and run the upgrade as a controlled deployment step.

If an earlier deployment ran these revisions with a non-`public` schema first
in `search_path`, stop and inspect the location of its tables and
`alembic_version` before upgrading. Moving existing registration data requires
a separately reviewed migration; the current revisions do not move it.

## Initial schema

Revision `20261019_0001` creates the tournament and signup tables. `slug` is a
required unique column. `declares_truthful_information` is a required signup
column with no server default, created with the table. There is no later
migration for either column. Drop a local database that was migrated with the
removed revisions, including `20261019_0002`, before upgrading this chain. From
the repository root, `make db-reset` does that for the
Compose database and then seeds a local Monomachia event. `starts_at` and `ends_at` are the
event dates. `registration_opens_on` and `registration_closes_on` are the
registration window. When create omits `slug`, the API builds it from the name,
modality, and the event year of `starts_at` in UTC−3.
