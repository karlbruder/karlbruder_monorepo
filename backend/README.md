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

## Tournament catalog API

`GET /api/tournaments` and `GET /api/tournaments/{id}` show non-internal
tournaments to guests. Internal tournaments are visible only to guild members
and guild staff; direct requests by other callers return 404. A supplied invalid
Bearer token returns 401 even on a guest-readable route. `POST /api/tournaments`
requires a verified guild staff token and returns 403 for other signed-in users.

The backend reads the application role only from the verified Supabase JWT's
Auth-managed `app_metadata.karlbruder_role` claim. Supported values are
`regular_user`, `guild_member`, and `admin`; a missing or unknown value has
regular-user access. User-editable `user_metadata` never grants membership or
staff access. Provision the trusted claim through an authorized Supabase admin
process; adding text to a client profile cannot grant permissions. This role
contract applies globally across tournaments, without event-specific grants.

## Tournament signup API

`POST /api/tournaments/{id}/signups` requires a verified Supabase token and
registers the token owner. The request supplies participant details and separate
required declarations, including an explicit image-use choice. The server takes
the owner UUID and account email from the token, compares the submitted email
using the registration normalization rule, and records the configured terms and
regulation versions, acceptance time, and request IP. Clients cannot choose an
owner, status, inscription number, accepted version, or staff safety note.
Registration requires both versions and an inclusive opening/closing date window
in fixed UTC-03:00. Staff closure or an unconfigured/outside window returns 400.
Full capacity does not prevent creation: new signups receive `awaiting_payment`
and no seat. Active duplicates by owner, normalized email, or normalized document
within the tournament return 409. A cancelled signup does not block replacement.

`GET /api/tournaments/{id}/signups/{inscription_number}` requires the owner or a
global admin. Others receive 404, including users who know the number; internal
tournaments remain hidden from regular users. `GET /api/tournaments/{id}/signups`
is admin-only and returns complete staff records. Owner responses exclude the
staff safety note and acceptance IP; no guest or participant-directory signup
route is provided here. Identity documents, contact information, and safety
notes must not be logged or exposed through public endpoints.

The configured version identifiers in this API are evidence references, not
approved consent text. Production registration still needs approved wording,
private parental-term and proof uploads, and the later payment/staff flows.

## Tests and lint

From `backend/`:

```sh
poetry run pytest
poetry run ruff check .
```

Install the development dependency group before running these commands. Database diagnostics and interactive authenticated requests require their configured services; running unit tests does not establish live integration health.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)
