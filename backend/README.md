# Karlbrüder backend

FastAPI service for the Karlbrüder application, using PostgreSQL for persistence and Poetry for dependency management.

## Requirements

- Python 3.12 and Poetry for host development.
- A PostgreSQL database accessible through `DATABASE_URL`.
- A Supabase project for authenticated API requests.

For container-based setup, follow the [root README](../README.md#local-setup-with-docker-compose).

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required SQLAlchemy database URI. |
| `SUPABASE_URL` | Supabase HTTPS project root used for access-token verification. |
| `AUTH_DATABASE_URL` | Optional PostgreSQL URI used only by `/health/auth`. |

Use [the environment example](../.env.example) as a reference. Host-run processes read exported environment variables; they do not automatically load the root `.env` file. Compose supplies its own local database default when `DATABASE_URL` is blank.

## Development

Run these commands from `backend/`, replacing the example values as needed:

```sh
poetry install --no-root --with dev
export DATABASE_URL='postgresql://user:password@127.0.0.1:5432/kb-db'
export SUPABASE_URL='https://PROJECT_REF.supabase.co'
poetry run uvicorn main:karlbruder_app --reload --host 127.0.0.1 --port 8000
```

The sample database URI matches the repository's local PostgreSQL service, which must be running first. On PowerShell, use `$env:NAME = 'value'` instead of `export NAME='value'`.

Open `http://localhost:8000/docs` for API documentation and interactive requests. For protected requests, use **Authorize** with a Supabase access token from the configured project.

## Diagnostics

- `/health` checks process liveness.
- `/health/db` checks database connectivity and reports whether `public` exists.
- `/health/auth` checks the optional Auth database connection and reports whether `auth` exists.

Database diagnostics report schema presence separately from connectivity; inspect the response body. They do not verify that application migrations have been applied. Connection failures return 503; details are logged by the backend.

## Domain migrations

Alembic manages the domain tables in the database selected by `DATABASE_URL`.
From `backend/`, apply migrations before starting an API version that uses new tables:

```sh
poetry run alembic upgrade head
poetry run alembic current
```

Local Compose and production deployment details, including a migration that
needs special care for existing signups, are in the [migration notes](docs/migrations.md).

From the repository root, these commands manage only the Compose database `kb-db`.
They stop if the backend `DATABASE_URL` is not that local database.

```sh
backend/scripts/local_database.sh reset
backend/scripts/local_database.sh drop
backend/scripts/local_database.sh seed
```

`reset` drops the `public` schema, applies Alembic head, and inserts Monomachia
when that slug is missing. The seeded event starts on 17 January 2027. Its
registration window is already open, and the local terms and regulation version
is `dev-local`. `drop` leaves the schema empty at head. `seed` inserts the same
event without deleting existing rows. The Compose `db` and `backend` services
need to be running.

## Tournament module

The [tournament guide](tournaments/README.md) explains the catalog and signup
APIs, access rules, registration behavior, and current release dependencies.

## Tests and lint

From the repository root, run the isolated test stack. It publishes no host ports. Pick a project name that is not already in use, then remove it when the run is finished.

```sh
docker compose -f compose.test.yml -p kb-test-local run --rm backend pytest -x
docker compose -f compose.test.yml -p kb-test-local run --rm backend ruff check .
docker compose -f compose.test.yml -p kb-test-local down -v
```

Rebuild that image after a dependency change. A narrower pytest command replaces the service command, so keep `-x` in it. Database diagnostics and interactive authenticated requests require their configured services. Running the test stack does not establish live integration health.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)
