# Karlbrüder backend

**Created**: 2026-01-09
**Last updated**: 2026-11-12

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
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy Supabase `service_role` key for the same project. Set it only in the backend environment. |
| `AUTH_DB_*` | Hosted PostgreSQL connection for `/api/health/auth`. It is not used to verify tokens. |
| `S3_BUCKET_NAME`, `S3_ENDPOINT_URL`, `S3_BROWSER_ENDPOINT_URL` | Private storage bucket, server endpoint, and browser endpoint for presigned URLs. |
| `SECRET_NAME`, `AWS_REGION` | Required AWS configuration. Secrets Manager fills values not supplied by environment or `.env`. |

Local Compose loads `backend/.env`. Production Compose loads
`/opt/karlbruder/backend.env`. Settings also read `.env` from the process's working
directory. Export `ENV_NAME` before startup because settings-class selection happens
before that file is read. Environment variables override `.env` values. Export
`SECRET_NAME` and `AWS_REGION` for AWS startup too.

To run on the host, install Python 3.12 and Poetry. From `backend/`:

```sh
poetry install --no-root --with dev
export ENV_NAME=local
export DB_HOST=localhost
export S3_ENDPOINT_URL=http://localhost:4566
poetry run uvicorn app.main:karlbruder_app --no-access-log --log-level critical --reload --host localhost --port 8000
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

## API route conventions

Follow the [HTTP route design guideline](AGENTS.md#http-route-design) for resource
URLs, router-owned prefixes, staff paths, HTTP methods, and workflow actions.
Existing endpoints are migrated only through an explicitly scoped API change.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md)

## Application mail configuration

Application mail uses AWS SES SMTP with authenticated STARTTLS and certificate
verification. Set `SMTP_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT` (normally 587),
`SMTP_USERNAME`, `SMTP_PASSWORD`, and `APP_BASE_URL`. Credentials belong in backend
environment configuration or Secrets Manager. Do not put them in browser settings.
`APP_BASE_URL` is the browser application origin without a path, credentials, query,
or fragment. Links open `/tournaments/registration` with `tournament_id` and
`registration_number`. The application still enforces ownership after sign-in.

`SMTP_TIMEOUT_SECONDS` defaults to 5 and must be greater than 0 and at most 30.
Each SMTP network operation uses that timeout. Port 465 is rejected because this
client uses STARTTLS rather than implicit TLS. Enabled delivery requires all
connection fields and the application origin at startup. Local and test delivery
are disabled by default. No mail emulator is included.

Current recipients come from a parameterized read of `auth.users.email` by UUID,
using `AUTH_DB_*`. The lifespan-owned lookup engine uses a 5-second pool wait,
connection timeout, and PostgreSQL statement timeout. Startup constructs clients
without opening external connections. The Auth database role needs SELECT access
to the required fields. The backend does not modify managed Auth tables.

Portuguese waitlist and rejected-proof helpers receive the sender as an explicit
`from_address` parameter. The workflow supplies `SMTP_FROM`, which defaults to
`Suporte Karlbrüder <no-reply@karlbruder.com.br>` and may be overridden in backend
configuration. The recipient is the tournament registrant, using their current
account address. The deciding admin does not receive these notices.
They attempt delivery once and return `sent`, `lookup_failed`, `unavailable`, or
`send_failed`. Logs include only review ID, notice type, and result. There are no
attachments, automatic retries, or durable outbox. The decision workflow must
call the helper after commit and after releasing locks. An application crash
between commit and delivery can lose a notice. The payment-review decision command invokes these helpers after commit. Real SES delivery, sender verification, credentials, and hosted Auth
read privileges remain deployment checks. Tests mock lookup and SMTP.


## Deferred concurrency test methodology

A future issue will introduce a `concurrency` pytest marker and a shared race-test
methodology. See the [testing specification](../specs/platform/testing.md).
The dedicated payment-review concurrency suite is deferred. Existing tests remain.
Transaction locks and atomic payment/capacity behavior remain in the implementation.

## Logging

Set `LOG_LEVEL` to DEBUG, INFO, WARNING, ERROR, or CRITICAL. The default is INFO. The API server writes structured logs to stdout with service `kb-backend`, environment from `ENV_NAME`, and release from `GIT_SHA` (default `NaN`). Local and test use readable console output with Rich tracebacks. Cloud environments use one JSON object per line. Exception output includes the full exception chain with messages and traceback locations. Frame locals are omitted.

The application middleware emits one access event with the request ID, HTTP method, route template, status and duration. Startup and shutdown failures emit a structured diagnostic. Successful health checks are omitted. Responses include an `X-Request-ID` header.

Access events can include a client-provided UUID from `X-Session-ID`, the AWS trace root from `X-Amzn-Trace-Id`, the Sentry trace ID, and the verified Supabase user UUID. The active Sentry span supplies the trace ID when available. The logger also accepts a valid `sentry-trace` or `x-sentry-trace` header. Use a dedicated correlation UUID for the session header.

Access events include the path, query string, full path, absolute URI, user agent, host, and origin when available. The separate `route` field holds the matched route template.
