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

Alembic owns the tournament tables in the domain database selected by `DATABASE_URL`.
It does not create or modify Supabase-managed `auth` objects. Run migrations from
`backend/` before starting an API version that uses new tables:

```sh
poetry run alembic upgrade head
poetry run alembic current
```

For local Compose, start the database with `docker compose up -d db` from the
repository root. The backend image also contains Alembic, so after building it
you can run `docker compose exec -T backend alembic upgrade head`. In
production, set `DATABASE_URL` to the intended Supabase PostgreSQL connection
and run the same upgrade as a controlled deployment step. Never run a downgrade
on a database containing real registrations without a reviewed data plan.

The registration opening and closing columns are calendar dates interpreted in
fixed UTC-03:00. `next_inscription_serial` is a tournament-local counter; future
signup creation must lock its Tournament row while allocating a number.
Inscription numbers use `T<tournament id>-<six-digit serial>-<Luhn digit>`;
they are references, not credentials. The accepted terms/regulation version
columns record references to configured content; approved text and upload flows
are required before this API can support a production registration journey.

## Tests and lint

From `backend/`:

```sh
poetry run pytest
poetry run ruff check .
```

Install the development dependency group before running these commands. Database diagnostics and interactive authenticated requests require their configured services; running unit tests does not establish live integration health.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)
