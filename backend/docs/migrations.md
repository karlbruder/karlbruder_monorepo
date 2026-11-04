# Domain migration notes

**Created**: 2026-10-26
**Last updated**: 2026-11-03

Alembic manages application domain tables in PostgreSQL `public`.
Connection settings select the target database through `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Supabase-managed `auth` objects are
outside this migration history. Domain tables and `alembic_version` are explicitly
qualified as `public`, even when another schema comes first in `search_path`.

## Clean initial schema

The product owner authorized replacing the old migration chain during issue #69
because there is no participant data to preserve. Revision `20261103_0001` is the
new initial migration. It creates the current tournament, registration, shared
file, registration-document, and payment-settings tables directly. It has no parent revision.
The old revisions and the intermediate rename migration are removed.

This is a deliberate pre-data reset. It does not provide an upgrade from the
removed history. A database still marked with an old revision cannot apply this
new history until its old domain schema and migration marker are cleared.

The product owner will remove the development domain tables. Include
`public.alembic_version` in that reset so Alembic can start from the new baseline.
Leave Supabase-managed `auth` objects intact. This repository change does not
perform that development reset. A database with data that must be retained needs
a separately reviewed conversion before adopting the new history.

The initial schema retains the unique tournament slug, separate declaration
choices, private document metadata, and optional Pix configuration. Event timestamps
are `starts_at` and `ends_at`. Registration windows use inclusive calendar dates
`registration_opens_on` and `registration_closes_on`. The local seed is a draft
fixture with placeholder terms/rules versions.

## Applying migrations

Verify the target database before applying changes. From `backend/`, run
`poetry run alembic upgrade head`, then `poetry run alembic current`.
A running local backend container can use
`docker compose exec -T backend alembic upgrade head` from the repository root.

Production uses the intended Supabase PostgreSQL database. The production
entrypoint runs `alembic upgrade head` before starting Gunicorn. A migration
failure exits without starting the API. Production data must never be reset
merely to make that startup pass.

Future revisions already published on `master` remain immutable. The issue #69
reset is an explicit one-time exception authorized by the product owner.
While the new baseline exists only on the issue branch, later #69 model
checkpoints may extend it before publication.

## Verification

Use the isolated root `compose.test.yml` database with a unique project name.
Run `alembic upgrade head`, `alembic check`, `alembic downgrade base`, and
`alembic upgrade head` there. Remove the disposable project with `down -v`,
including after a failure. The backend suite also tests rebuilding the schema
with the existing PostgreSQL fixture and exercises the resulting constraints.

No #59 upgrade rehearsal is required after this approved reset. Do not run
`make db-reset` against the development database merely to verify migrations.
The local reset helper remains available for a separately authorized local reset.
