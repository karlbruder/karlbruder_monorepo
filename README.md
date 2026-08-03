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

After adding, changing, or removing `DATABASE_URL`, recreate the backend
container:

```powershell
docker compose up -d --force-recreate backend
```

The `db` service remains available in both cases, but each backend process
maintains only one active SQL connection. The two databases are not
synchronized. To run the backend directly on the host machine, explicitly
define `DATABASE_URL`; outside Compose, there is no fallback using the `db`
hostname.

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
Browser -> Nginx/React -> FastAPI -> PostgreSQL
```

The frontend never connects directly to the database.

Local data is independent from Supabase data and is not synchronized
automatically. Once the project includes Alembic migrations, the same
migrations must be applied to both environments to keep their database
structures equivalent.

## Deployment Database: EC2 and Supabase

The `compose.yml` file in this repository is intended for local development.
In the EC2 deployment, the backend and frontend run without the `db` service.
The backend receives, through the `DATABASE_URL` environment variable, the
Postgres URI for the same Supabase project used by Supabase Auth.

There is no conditional code for creating different database engines. The same
engine reads the final value of `DATABASE_URL`:

```text
Local: DATABASE_URL -> Compose Postgres
EC2:   DATABASE_URL -> Supabase Postgres
```

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

The URI contains the database password and must be stored in AWS Secrets
Manager or SSM Parameter Store, then injected into the container environment as
`DATABASE_URL`. Never place the URI in source code, a Dockerfile, versioned
files, or `VITE_*` variables: any variable bundled into the frontend is visible
to the browser.

### Schema Separation

The Supabase database is shared, but the data remains separated by schema:

* `auth`: managed by Supabase Auth;
* `public`: Karlbruder domain tables, indexes, and migrations.

Future backend models and migrations must explicitly create domain objects in
`public` and must not modify objects belonging to `auth`.

### Manual Validation on EC2

After injecting the secret and starting the backend without local PostgreSQL:

1. Open `GET /health` and confirm that the API is running.
2. Open `GET /health/db`.
3. Confirm an HTTP 200 response with the following body:

   ```json
   {
     "status": "ok",
     "database": "connected",
     "database_target": "supabase",
     "result": 1,
     "schemas": {
       "public": true,
       "auth": true
     }
   }
   ```

`database_target` may be `local`, `supabase`, or `external`. In local
PostgreSQL, `public` exists and `auth` will normally appear as `false`; in
Supabase, both should exist. The absence of `auth` in the local database does
not make the service unhealthy. A configuration, connection, or query failure
returns HTTP 503 without exposing the URI or internal details. Check the
private backend logs for investigation.

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
