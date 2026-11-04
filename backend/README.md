# Karlbrüder backend

**Created**: 2026-01-09
**Last updated**: 2026-11-04

FastAPI service for the Karlbrüder application, using PostgreSQL for persistence and Poetry for dependency management.

## Setup and development

For the full local stack, follow the [root setup](../README.md#local-setup-with-docker-compose).
Compose runs the API on port 8000, PostgreSQL on 5432, and Ministack on 4566.
Authentication uses hosted Supabase.

Copy [`.env.example`](.env.example) to `backend/.env` and fill in the project values:

| Settings | Purpose |
| --- | --- |
| `ENV_NAME` | `local` or `test` selects that settings class. Other names select AWS settings. |
| `DB_*` | Domain PostgreSQL connection, used to build the database URL. |
| `SUPABASE_URL` | HTTPS project root for access-token verification. |
| `AUTH_DB_*` | Hosted PostgreSQL connection for `/api/health/auth`. It is not used to verify tokens. |
| `S3_BUCKET_NAME`, `S3_ENDPOINT_URL`, `S3_BROWSER_ENDPOINT_URL` | Private storage bucket, server endpoint, and browser endpoint for presigned URLs. |
| `SECRET_NAME`, `AWS_REGION` | Required AWS configuration. Secrets Manager fills values not supplied by environment or `.env`. |

Local Compose loads `backend/.env`. Production Compose loads
`/opt/karlbruder/backend.env`. Settings also read `.env` from the process's working
directory. Export `ENV_NAME` before startup because settings-class selection happens
before that file is read. Environment variables override `.env` values. Export
`SECRET_NAME` and `AWS_REGION` for AWS startup too. The current region fallback is a
[known gap](AGENTS.md#known-implementation-gaps), not the intended deployment policy.

To run on the host, install Python 3.12 and Poetry. From `backend/`:

```sh
poetry install --no-root --with dev
export ENV_NAME=local
export DB_HOST=localhost
export S3_ENDPOINT_URL=http://localhost:4566
poetry run uvicorn app.main:karlbruder_app --reload --host localhost --port 8000
```

PostgreSQL and Ministack must already be running. Keep the remaining settings in
`backend/.env`. On PowerShell, use `$env:NAME = 'value'` instead of `export`.

Open `http://localhost:8000/api/docs`. Use **Authorize** with a Supabase access token
for protected requests.

## API structure

| Location | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI creation, database lifespan, middleware, and documentation configuration |
| `app/api/router.py` | Router assembly and release metadata |
| `app/api/exception_handlers.py` | Domain-error to HTTP mappings |
| `app/api/health/` | Health routes and connectivity checks |
| `app/auth/` | Verified identity values, token/role services, dependencies, and `/api/users/me` |
| `app/core/db/` | Model base, engine factories, and session scopes |

[AGENTS.md](AGENTS.md) defines editing and dependency rules. Use the
[tournament guide](app/tournaments/README.md) or [payment guide](app/payments/README.md)
when working on those contracts. Staff review and refund commands are not implemented.

Swagger UI is at `/api/docs`, with its redirect helper at
`/api/docs/oauth2-redirect`. The OpenAPI document is at `/api/openapi.json`.
ReDoc is disabled.
Throttling is not implemented.

## Database lifecycle

FastAPI lifespan initializes and disposes sync and async resources. Domain workflows
continue to use synchronous sessions and own their commit/rollback boundaries.
Scripts and migrations create and dispose their own engines.

Mapped models share integer IDs and timestamps, ordered `id`, `created_at`,
`updated_at`, then domain fields. SQLAlchemy maintains `updated_at` on updates.
Direct SQL writers must maintain it themselves. No shared UUID fields or soft deletion
are provided. Apply Alembic head before starting the API.

## Diagnostics

- `/api/health` checks process liveness and returns 200 with no body.
- `/api/metadata` returns `git_sha` and `released_at`.
- `/api/health/db` checks database connectivity and reports whether `public` exists.
- `/api/health/auth` checks the separately configured Auth database and reports whether `auth` exists. A local Supabase Auth stack is not included.

These endpoints are public. Database diagnostics report schema presence separately from connectivity. Inspect the response body. They do not verify migrations. Connection failures return 503 and are logged.

## Domain migrations

Alembic manages domain tables in the database selected by `DB_*`. Follow the
[migration notes](../docs/database-migrations.md) to apply or verify migrations before starting
an API version that uses new tables.

The initial revision has no upgrade path from the earlier development schema.
Read the guide's [reset prerequisite](../docs/database-migrations.md#initial-schema-and-reset-prerequisite)
before adopting it. Leave Supabase-managed `auth` objects intact.

From the repository root, these commands manage only the Compose database `postgres`.
They stop if the backend database host is not `db` or the database name is not `postgres`.

```sh
make db-reset
make db-drop
make db-seed
```

Those targets call `scripts/local_database.sh`.

`reset` recreates `public`, migrates to head, and seeds Monomachia if missing.
`drop` recreates the schema at head without seed data. `seed` adds the event without
deleting rows. The local seed uses 17 January 2027, an open registration window,
and terms/rules version `dev-local`. Compose `db` and `backend` must be running.

## Tests and lint

From the repository root, use the isolated test stack. It publishes no host ports:

```sh
make test-backend TEST_PROJECT=kb-test-your-name
make lint-backend TEST_PROJECT=kb-test-your-name
```

`test-backend` runs pytest with `-x`. `lint-backend` runs Ruff. Both remove the test project afterward. Choose a unique project name. See [AGENTS.md](AGENTS.md#tests-and-verification) for direct commands and narrower test selections.

Rebuild after dependency changes. The test stack does not establish live Supabase or storage integration health.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)
