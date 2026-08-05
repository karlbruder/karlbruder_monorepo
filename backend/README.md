# Karlbruder Backend

FastAPI API responsible for domain logic and Postgres access.

## Configuration

The domain database and Supabase Auth database use separate configuration:

* `DATABASE_URL` selects the domain database and defaults to the local `db`
  service in Docker Compose;
* `AUTH_DATABASE_URL` always selects the Supabase Postgres database containing
  the managed `auth` schema;
* `SUPABASE_URL` is the HTTPS project root used to verify Supabase access tokens
  against the project's public JWKS endpoint;
* the EC2 deployment injects both values through secrets. They may currently
  contain the same Supabase URI, but they have independent responsibilities.

The local fallback is handled by Compose. When running the backend directly on
the host machine, `DATABASE_URL` remains required. `AUTH_DATABASE_URL` is
required when `/health/auth` is called. Use
[`../.env.example`](../.env.example) as a reference, and do not commit
credentials to version control.

`SUPABASE_URL` is public configuration and must contain only the project root,
for example `https://project-ref.supabase.co`. The backend derives both the
expected token issuer and `/.well-known/jwks.json` URL from it. Do not configure
the JWT secret, service-role key, or a copied signing key in the backend.

The verifier accepts only the explicitly allowlisted ES256 and RS256 asymmetric
signing algorithms. It never derives trusted algorithms from an unverified JWT
header.

## Authentication smoke test

`GET /api/users/me` is the minimal protected endpoint. It accepts a Supabase
access token in the standard header:

```text
Authorization: Bearer <access_token>
```

Without a token, or with an invalid or expired token, it returns HTTP 401. With
a verified token it returns the user's `id`, optional `email`, `user_metadata`,
and `app_metadata`. `user_metadata` is user-editable profile data and must not
be used for authorization decisions.

Until the frontend authentication flow exists, sign in directly through
Supabase Auth to obtain a test user's `access_token`. Then open
`http://localhost:8000/docs`, select **Authorize**, paste the access token, and
call `GET /api/users/me`. The publishable key used for direct sign-in is not a
backend runtime secret and is not required by the verification dependency.

## Development

```powershell
poetry install
poetry run uvicorn main:karlbruder_app --reload
```

## Tests

```powershell
poetry run pytest
poetry run ruff check auth.py database.py main.py models.py settings.py tests
```

The acceptance criteria for issue PF-01 are consolidated in
`tests/pf_01_test_backend_postgres_supabase.py`. Static and unit checks run
normally, while real database connections must be explicitly enabled.

With the local Compose environment already running:

```powershell
$env:PF01_RUN_LOCAL_INTEGRATION = "1"
poetry run pytest tests/pf_01_test_backend_postgres_supabase.py
Remove-Item Env:PF01_RUN_LOCAL_INTEGRATION
```

To include remote acceptance testing, create the ignored `.env.supabase` file
with the Supabase Postgres `DATABASE_URL`, then run:

```powershell
$env:PF01_RUN_LOCAL_INTEGRATION = "1"
$env:PF01_RUN_SUPABASE_INTEGRATION = "1"
poetry run pytest tests/pf_01_test_backend_postgres_supabase.py
Remove-Item Env:PF01_RUN_LOCAL_INTEGRATION
Remove-Item Env:PF01_RUN_SUPABASE_INTEGRATION
```

Without these flags, tests that would access real databases are marked as
skipped. The test never prints the Supabase URI or password.

`GET /health/db` checks only the domain connection and `public` schema.
`GET /health/auth` independently checks the Supabase Auth connection and `auth`
schema. Each endpoint returns the configured SQLAlchemy URL with its password
redacted, so the destination is explicit and no hostname classification is
needed. A failed or missing connection returns HTTP 503 without internal error
details.

Domain tables and migrations must use the `public` schema. The `auth` schema
belongs to Supabase Auth and must not be modified by the backend.
