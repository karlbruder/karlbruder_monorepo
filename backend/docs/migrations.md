# Domain migration notes

Alembic manages Karlbrüder domain tables in the database selected by
`DATABASE_URL`. The migrations use PostgreSQL's `public` schema and do not create
or modify Supabase-managed `auth` objects. Tournament table names, their foreign
key, indexes, and Alembic version state are explicitly qualified as `public`,
even when another schema comes first in the connection's `search_path`. Verify
the target database before a controlled deployment, then run
`poetry run alembic upgrade head` and
`poetry run alembic current` from `backend/`.

For local Compose, start PostgreSQL with `docker compose up -d db` from the
repository root. The backend image also contains Alembic, so a built and running
backend can apply migrations with `docker compose exec -T backend alembic upgrade head`.
In production, point `DATABASE_URL` at the intended Supabase PostgreSQL database
and run the upgrade as a controlled deployment step.

If an earlier deployment ran these revisions with a non-`public` schema first
in `search_path`, stop and inspect the location of its tables and
`alembic_version` before upgrading. Moving existing registration data requires
a separately reviewed migration; the current revisions do not move it.

## Existing signups at revision `20261019_0001`

Revision `20261019_0002` adds a required truthful-information declaration with no
server default. Its upgrade fails if existing signup rows would need an invented
acceptance value. Stop that deployment and arrange a separately reviewed
evidence/data migration. Do not backfill `true` without participant evidence.
Do not downgrade a database containing real registrations without a reviewed
data plan.

## Assigning a slug to an existing event

Revision `20261030_0003` adds a nullable, unique tournament slug and does not
guess which existing row represents Monomachia. After applying the migration to
the intended domain database, identify the exact event by its ID and other event
facts. Assign `monomachia-2027` only to that verified row in a controlled
transaction. For example, replace `<VERIFIED_EVENT_ID>` before running the SQL:

```sql
BEGIN;
SELECT id, name, starts_at, slug
FROM public.tournaments
WHERE id = <VERIFIED_EVENT_ID>
FOR UPDATE;
-- Confirm this is the intended Monomachia event and slug is NULL.
UPDATE public.tournaments
SET slug = 'monomachia-2027'
WHERE id = <VERIFIED_EVENT_ID> AND slug IS NULL
RETURNING id, name, slug;
```

Confirm exactly one expected row was returned, then issue `COMMIT`; otherwise
issue `ROLLBACK`. Never run the example as an unattended batch.

The slug is a stable lookup key, so later name edits do not change it. A unique
constraint rejects an assignment already used by another event. Do not run the
example against the legacy local `kb-db` whose Alembic revision does not match
the current migration chain; prepare a fresh local database or review a separate
data migration first.
