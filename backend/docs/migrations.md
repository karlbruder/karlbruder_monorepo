# Domain migration notes

**Created**: 2026-10-26
**Last updated**: 2026-11-04

Alembic manages application domain tables and its version marker in PostgreSQL
`public`. Connection settings select the database through `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Supabase-managed `auth` objects are
outside this history.

## Initial schema and reset prerequisite

Revision `20261103_0001` is the parentless initial schema. It replaces the removed
pre-data history under the issue #69 reset authorization. It has no upgrade path
from that history.

Before adopting this baseline, the user must remove the old development domain
tables and `public.alembic_version`. Leave Supabase-managed `auth` objects intact.
This repository change does not reset a developer or production database.
Future revisions published on `master` remain immutable.

## Applying migrations

Verify the target database. From `backend/`, run `poetry run alembic upgrade head`,
then `poetry run alembic current`. A running local backend container can use
`docker compose exec -T backend alembic upgrade head` from the repository root.

Production uses Supabase PostgreSQL. Its entrypoint applies migrations before
starting Gunicorn. A migration failure prevents API startup. Never reset
production data to make startup pass.

## Verification

Use root `compose.test.yml` with a unique disposable project name. Run
`alembic upgrade head`, `alembic check`, `alembic downgrade base`,
`alembic upgrade head`, and `alembic check`. Always remove the test project with
`down -v`. Do not use `make db-reset` to verify migrations.

Schema comparison does not verify triggers. The backend suite also checks
immutable acceptance/archive evidence, archived file metadata, reviewed proof
associations and their file metadata, verified receipts, and payment/refund
consistency. Downgrade removes the evidence guards with their tables.
