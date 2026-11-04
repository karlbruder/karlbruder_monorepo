# Karlbrüder backend

**Created**: 2026-01-09
**Last updated**: 2026-11-04

FastAPI service for the Karlbrüder application, using PostgreSQL for persistence and Poetry for dependency management.

## Requirements

- Python 3.12 and Poetry for host development.
- A PostgreSQL database described by `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- A Supabase project for authenticated API requests.

For container-based setup, follow the [root README](../README.md#local-setup-with-docker-compose).

## Configuration

| Variable | Purpose |
| --- | --- |
| `ENV_NAME` | `local` and `test` use those settings. Any other name uses AWS settings and requires `SECRET_NAME` and `AWS_REGION`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Domain PostgreSQL connection. The backend builds the URL from these values. |
| `SUPABASE_URL` | Supabase HTTPS project root used for access-token verification. |
| `AUTH_DB_HOST`, `AUTH_DB_PORT`, `AUTH_DB_NAME`, `AUTH_DB_USER`, `AUTH_DB_PASSWORD` | PostgreSQL connection used by `/api/health/auth`. |
| `SECRET_NAME`, `AWS_REGION` | Required for AWS environments. Secrets Manager fills settings that are still empty. |

Copy [the environment example](.env.example) to `backend/.env`. Local Compose loads that file into the backend container. Production Compose loads `/opt/karlbruder/backend.env` on the application host. A host-run process does not load either file automatically, so export the same variables before starting Uvicorn. Use `localhost` as the database host in that case.

## Development

Run these commands from `backend/`, replacing the example values as needed:

```sh
poetry install --no-root --with dev
export ENV_NAME=local
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=postgres
export SUPABASE_URL='https://PROJECT_REF.supabase.co'
poetry run uvicorn app.main:karlbruder_app --reload --host localhost --port 8000
```

The sample database settings match the repository's local PostgreSQL service, which must be running first. On PowerShell, use `$env:NAME = 'value'` instead of `export NAME='value'`.

Open `http://localhost:8000/docs` for API documentation and interactive requests. For protected requests, use **Authorize** with a Supabase access token from the configured project.

## Diagnostics

- `/api/health` checks process liveness and returns 200 with no body.
- `/api/metadata` returns `git_sha` and `released_at`.
- `/api/health/db` checks database connectivity and reports whether `public` exists.
- `/api/health/auth` checks the optional Auth database connection and reports whether `auth` exists.

Database diagnostics report schema presence separately from connectivity; inspect the response body. They do not verify that application migrations have been applied. Connection failures return 503; details are logged by the backend.

## Domain migrations

Alembic manages the domain tables in the database selected by the `DB_*` settings.
From `backend/`, apply migrations before starting an API version that uses new tables:

```sh
poetry run alembic upgrade head
poetry run alembic current
```

The pre-data refactor uses the clean initial revision `20261103_0001`.
It replaces the old history and has no old-schema upgrade path. A user-managed
development reset must include `public.alembic_version` and leave Supabase-managed
`auth` objects intact. See the [migration notes](docs/migrations.md).

From the repository root, these commands manage only the Compose database `postgres`.
They stop if the backend database host is not `db` or the database name is not `postgres`.

```sh
make db-reset
make db-drop
make db-seed
```

Those targets run `scripts/local_database.sh`. The same script can be called directly from the repository root.

`reset` drops the `public` schema, applies Alembic head, and inserts Monomachia
when that slug is missing. The seeded event starts on 17 January 2027. Its
registration window is already open, and the local terms and rules version
is `dev-local`. `drop` leaves the schema empty at head. `seed` inserts the same
event without deleting existing rows. The Compose `db` and `backend` services
need to be running.

## Tournament module

The [tournament guide](app/tournaments/README.md) explains the catalog and registration
APIs, access rules, registration behavior, and current release dependencies.

## Tests and lint

From the repository root, run the isolated test stack. It publishes no host ports. Pick a project name that is not already in use, then remove it when the run is finished.

```sh
make test-backend
make lint-backend
```

`make test-backend` runs pytest with `-x`, then removes that Compose project. `make lint-backend` runs Ruff the same way. The default project name is `kb-test-local`. Pass `TEST_PROJECT=kb-test-name` when another run may already be using it. The direct commands are `docker compose -f compose.test.yml -p kb-test-local run --rm backend pytest -x` and the same form with `ruff check .`.

Rebuild that image after a dependency change. A narrower pytest command replaces the service command, so keep `-x` in it. Database diagnostics and interactive authenticated requests require their configured services. Running the test stack does not establish live integration health.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)
