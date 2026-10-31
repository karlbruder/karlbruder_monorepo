#!/usr/bin/env bash
# Reset or seed the Compose PostgreSQL database used for local development.
# This talks to the db service in compose.yml. It refuses to migrate when the
# backend DATABASE_URL is not that local database.

set -euo pipefail

root_directory="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_directory"

usage() {
  echo "Usage: backend/scripts/local_database.sh drop|seed|reset" >&2
  echo "  drop   Recreate the public schema and apply Alembic head." >&2
  echo "  seed   Insert the local Monomachia event when it is missing." >&2
  echo "  reset  Drop, migrate, then seed." >&2
}

require_local_backend_database() {
  docker compose exec -T backend python -c "
from sqlalchemy.engine import make_url
import os
import sys

url = make_url(os.environ.get('DATABASE_URL', ''))
host = (url.host or '').lower()
database_name = url.database or ''
if host != 'db' or database_name != 'kb-db':
    print(
        'Refusing to change a database that is not the local Compose database kb-db on host db.',
        file=sys.stderr,
    )
    sys.exit(1)
"
}

drop_public_schema() {
  docker compose exec -T db psql -U user -d kb-db -v ON_ERROR_STOP=1 <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL
}

apply_migrations() {
  docker compose exec -T backend alembic upgrade head
}

seed_monomachia() {
  docker compose exec -T db psql -U user -d kb-db -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.tournaments (
    name,
    slug,
    modality,
    starts_at,
    location,
    registration_opens_on,
    registration_closes_on,
    terms_version,
    regulation_version
)
SELECT
    'Monomachia',
    'monomachia-a-confirmar-2027',
    'A confirmar',
    TIMESTAMPTZ '2027-01-17 00:00:00-03',
    'A confirmar',
    CURRENT_DATE - 1,
    DATE '2027-01-16',
    'dev-local',
    'dev-local'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE slug = 'monomachia-a-confirmar-2027'
);
SQL
}

command="${1:-}"

case "$command" in
  drop)
    require_local_backend_database
    drop_public_schema
    apply_migrations
    ;;
  seed)
    require_local_backend_database
    seed_monomachia
    ;;
  reset)
    require_local_backend_database
    drop_public_schema
    apply_migrations
    seed_monomachia
    ;;
  *)
    usage
    exit 1
    ;;
esac
