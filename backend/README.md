# Karlbruder Backend

FastAPI API responsible for domain logic and Postgres access.

## Configuration

`DATABASE_URL` is the sole SQL connection configuration:

* if the variable is absent from the root `.env` file, Docker Compose uses the local `db` service;
* if the variable is defined in `.env`, Compose uses the provided URI, including a Supabase URI;
* the EC2 deployment injects the Supabase Postgres URI through a secret.

The local fallback is handled by Compose. When running the backend directly on
the host machine, `DATABASE_URL` remains required. Use
[`../.env.example`](../.env.example) as a reference, and do not commit
credentials to version control.

## Development

```powershell
poetry install
poetry run uvicorn main:karlbruder_app --reload
```

## Tests

```powershell
poetry run pytest
poetry run ruff check database.py main.py tests
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
with the Postgres `DATABASE_URL`, then run:

```powershell
$env:PF01_RUN_LOCAL_INTEGRATION = "1"
$env:PF01_RUN_SUPABASE_INTEGRATION = "1"
poetry run pytest tests/pf_01_test_backend_postgres_supabase.py
Remove-Item Env:PF01_RUN_LOCAL_INTEGRATION
Remove-Item Env:PF01_RUN_SUPABASE_INTEGRATION
```

Without these flags, tests that would access real databases are marked as
skipped. The test never prints the Supabase URI or password.

The `GET /health/db` endpoint executes `SELECT 1`, classifies the connection as
`local`, `supabase`, or `external`, and reports whether the `public` and `auth`
schemas exist. It returns HTTP 200 when the queries succeed and HTTP 503,
without sensitive details, when the connection fails. `auth: false` is expected
when using the local Postgres instance.

Domain tables and migrations must use the `public` schema. The `auth` schema
belongs to Supabase Auth and must not be modified by the backend.
