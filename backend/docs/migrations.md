# Domain migration notes

Alembic manages Karlbrüder domain tables in the database selected by
`DATABASE_URL`. The migrations use PostgreSQL's `public` schema and do not create
or modify Supabase-managed `auth` objects. Verify the target database before a
controlled deployment, then run `poetry run alembic upgrade head` and
`poetry run alembic current` from `backend/`.

For local Compose, start PostgreSQL with `docker compose up -d db` from the
repository root. The backend image also contains Alembic, so a built and running
backend can apply migrations with `docker compose exec -T backend alembic upgrade head`.
In production, point `DATABASE_URL` at the intended Supabase PostgreSQL database
and run the upgrade as a controlled deployment step.

## Existing signups at revision `20261019_0001`

Revision `20261019_0002` adds a required truthful-information declaration with no
server default. Its upgrade fails if existing signup rows would need an invented
acceptance value. Stop that deployment and arrange a separately reviewed
evidence/data migration. Do not backfill `true` without participant evidence.
Do not downgrade a database containing real registrations without a reviewed
data plan.
