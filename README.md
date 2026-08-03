# Karlbrüder

Monorepo for the Karlbrüder fencing school website and management system.

## Structure

* `landing/`: public institutional website built with React.
* `frontend/`: React application using TypeScript and Vite.
* `backend/`: FastAPI API managed with Poetry.
* `compose.yml`: local environment containing the frontend, backend, and PostgreSQL.

At this stage, the local application does not include authentication. The
environment consists only of the frontend, backend, and local PostgreSQL
database.

## Requirements

To run the complete local environment, install:

* Git
* Docker Desktop with Docker Compose

Python, Poetry, Node.js, and PostgreSQL do not need to be installed directly on
the machine when the project is run with Docker.

## Running the System

Open Docker Desktop and, from the repository root, run:

```powershell
docker compose up --build
```

On the first run, Docker will download the required images and build the
frontend and backend. Wait until all services appear as started.

Then access:

* Application: http://localhost:3000
* Visual diagnostics: http://localhost:3000/health
* API: http://localhost:8000
* Swagger documentation: http://localhost:8000/docs
* Backend health check: http://localhost:8000/health
* Database health check: http://localhost:8000/health/db
* Supabase Auth health check: http://localhost:8000/health/auth

PostgreSQL is available at `localhost:5432` using the following local
credentials:

```text
database: kb-db
user: user
password: password
```

These credentials are exclusive to the local environment defined in Compose.
They are intentionally simple and must not be reused outside the local
environment. The port is published only on `127.0.0.1`, so the database is not
directly exposed to the machine's network.

When `DATABASE_URL` is not defined in the root `.env` file, Compose injects the
default local configuration into the backend:

```text
DATABASE_URL=postgresql://user:password@db:5432/kb-db
```

`db` is the DNS name of the service within the Compose network. To test the
same backend with Supabase, copy [`.env.example`](.env.example) to `.env` and
set `DATABASE_URL` to the Supabase Postgres URI. Compose uses the expression
`${DATABASE_URL:-postgresql://user:password@db:5432/kb-db}`: a defined value
overrides the default, while an absent or empty value keeps the local database.

`AUTH_DATABASE_URL` is independent from `DATABASE_URL` and always points to the
Supabase Postgres database that owns the `auth` schema. Add it to the root
`.env` file to enable `/health/auth`:

```text
AUTH_DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/postgres?sslmode=require
```

If it is absent, the domain API and `/health/db` still work, while
`/health/auth` returns HTTP 503 to make the missing configuration explicit.

After changing either database URL, recreate the backend container:

```powershell
docker compose up -d --force-recreate backend
```

The `db` service remains available in both cases. The backend keeps the domain
and Auth connections separate, even when both URLs happen to point to the same
Supabase project. The databases are not synchronized. To run the backend
directly on the host machine, explicitly define `DATABASE_URL`; outside
Compose, there is no fallback using the `db` hostname.

## Stopping the System

In the terminal where Compose is running, press `Ctrl+C`. To remove the
containers and local network afterward, run:

```powershell
docker compose down
```

This command preserves the PostgreSQL volume. Do not use
`docker compose down -v` if you want to retain the local data.

## Local Request Flow

The browser accesses only the frontend. Nginx forwards requests beginning with
`/api/` to FastAPI, and only the backend accesses PostgreSQL:

```text
Browser -> Nginx/React -> FastAPI -> Domain PostgreSQL
                              `----> Supabase Auth PostgreSQL
```

The frontend never connects directly to the database.

Local data is independent from Supabase data and is not synchronized
automatically. Once the project includes Alembic migrations, the same
migrations must be applied to both environments to keep their database
structures equivalent.

## Deployment Database: EC2 and Supabase

The `compose.yml` file in this repository is intended for local development.
In the EC2 deployment, the backend and frontend run without the `db` service.
The backend has two explicit connections:

```text
Local domain: DATABASE_URL      -> Compose Postgres
EC2 domain:   DATABASE_URL      -> domain Postgres (currently Supabase)
All Auth:      AUTH_DATABASE_URL -> Supabase Postgres
```

This separation lets the domain database move to a self-hosted Postgres later
without making Supabase Auth appear local or coupling its health to the domain
database health check.

Because the EC2 backend is a persistent service, select one of the following
options from the Supabase **Connect** panel:

* a direct connection when the EC2 instance or VPC has IPv6 connectivity, or
  when the Supabase project has the IPv4 add-on;
* Supavisor in **session mode**, using port 5432, when the EC2 instance supports
  only IPv4.

See the official documentation on
[Supabase Postgres connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
Use SSL for the remote connection, for example with `sslmode=require`, if that
parameter is not already included in the URI provided by the Supabase panel.
Transaction mode is intended for serverless clients and is not the recommended
option for this persistent backend.

Both URIs contain database passwords and must be stored in AWS Secrets Manager
or SSM Parameter Store, then injected into the container environment as
`DATABASE_URL` and `AUTH_DATABASE_URL`. Never place either URI in source code,
a Dockerfile, versioned files, or `VITE_*` variables: any variable bundled into
the frontend is visible to the browser.

### Schema Separation

The responsibilities remain separated by schema, whether or not both schemas
currently live in the same physical Supabase database:

* `auth`: managed by Supabase Auth;
* `public`: Karlbruder domain tables, indexes, and migrations.

Future backend models and migrations must explicitly create domain objects in
`public` and must not modify objects belonging to `auth`.

### Manual Validation on EC2

After injecting the secret and starting the backend without local PostgreSQL:

1. Open `GET /health` and confirm that the API is running.
2. Open `GET /health/db` and confirm the domain connection and `public` schema:

   ```json
   {
     "status": "ok",
     "database": "connected",
     "database_url": "postgresql://user:***@domain-db:5432/app",
     "result": 1,
     "schema": {
       "public": true
     }
   }
   ```

3. Open `GET /health/auth` and confirm the independent Supabase connection and
   `auth` schema:

   ```json
   {
     "status": "ok",
     "auth": "connected",
     "database_url": "postgresql://postgres.project:***@pooler.supabase.com:5432/postgres",
     "result": 1,
     "schema": {
       "auth": true
     }
   }
   ```

The URLs make the actual destinations visible without guessing from hostname
patterns; passwords are redacted. A missing configuration, connection, or
query failure returns HTTP 503 without exposing internal error details. Check
the private backend logs for investigation.

## Backend Tests

With Python and Poetry installed:

```powershell
cd backend
poetry install
poetry run pytest
poetry run ruff check database.py main.py tests
```

For the integrated smoke test, start the Compose environment and confirm that
the `db`, `backend`, and `frontend` services remain healthy. The backend
container health check uses `/health/db`, so the container is considered
healthy only when `SELECT 1` succeeds.
