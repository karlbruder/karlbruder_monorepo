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

## Tests and lint

From `backend/`:

```sh
poetry run pytest
poetry run ruff check .
```

Install the development dependency group before running these commands. Database diagnostics and interactive authenticated requests require their configured services; running unit tests does not establish live integration health.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)
