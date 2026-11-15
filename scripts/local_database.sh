#!/usr/bin/env bash
# Reset or seed the Compose PostgreSQL database used for local development.
# Refuses to migrate unless the backend is pointed at the Compose db service.

set -euo pipefail

root_directory="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root_directory"

usage() {
  echo "Usage: scripts/local_database.sh drop|seed|reset" >&2
  echo "  drop   Recreate the public schema and apply Alembic head." >&2
  echo "  seed   Insert the local Monomachia event when it is missing." >&2
  echo "  reset  Drop, migrate, then seed." >&2
}

require_local_backend_database() {
  docker compose exec -T backend python -c "
import sys

from config import settings

host = settings.DB_HOST.lower()
database_name = settings.DB_NAME
if host != 'db' or database_name != 'postgres':
    print(
        'Refusing to change a database that is not the local Compose database postgres on host db.',
        file=sys.stderr,
    )
    sys.exit(1)
"
}

drop_public_schema() {
  docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
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
  docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.tournaments (
    name,
    slug,
    discipline,
    starts_at,
    location,
    registration_opens_on,
    registration_closes_on,
    terms_version,
    rules_version
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

-- Development fixtures for Monomachia registration products.
DO $$
DECLARE
    event_id integer;
    seed_product_id integer;
    option_record record;
BEGIN
    SELECT id INTO STRICT event_id
    FROM public.tournaments WHERE slug = 'monomachia-a-confirmar-2027';

    FOR option_record IN
        SELECT * FROM (VALUES
            ('Inscrição Social', 'Participação e troféu em caso de vitória. Não inclui outras premiações, cupons ou brindes de patrocinadores.', 50.00::numeric),
            ('Inscrição Plena', 'Participação, premiações para ganhadores e distribuição de cupons e brindes de patrocinadores.', 100.00::numeric),
            ('Inscrição Plus', 'Benefícios da Plena e pacote com camiseta, brindes e café da manhã. Conteúdo completo a confirmar.', 200.00::numeric)
        ) AS options(name, description, amount)
    LOOP
        SELECT p.id INTO seed_product_id
        FROM public.products p
        JOIN public.tournament_products tp ON tp.product_id = p.id
        WHERE tp.tournament_id = event_id AND p.name = option_record.name
        LIMIT 1;

        IF seed_product_id IS NULL THEN
            INSERT INTO public.products (name, description)
            VALUES (option_record.name, option_record.description)
            RETURNING id INTO seed_product_id;
            INSERT INTO public.tournament_products (tournament_id, product_id)
            VALUES (event_id, seed_product_id);
        END IF;

        IF option_record.amount IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.prices WHERE prices.product_id = seed_product_id
        ) THEN
            INSERT INTO public.prices (product_id, amount)
            VALUES (seed_product_id, option_record.amount);
        END IF;
    END LOOP;
END $$;

-- Illustrative development fixtures. Existing tag records are not overwritten.
INSERT INTO public.tournament_tags (tournament_id, name, eligibility_description)
SELECT tournament.id, fixture.name, fixture.description
FROM public.tournaments AS tournament
CROSS JOIN (VALUES
    ('Mystai', 'Atletas que disputam sua primeira competição.'),
    ('Neophytoi', 'Atletas com menos de um ano de prática de esgrima histórica.'),
    ('Amazones', 'Atletas mulheres cisgênero.'),
    ('Poikilia', 'Atletas de gêneros sub-representados.'),
    ('Hoplitai', 'Atletas experientes que atendam a pelo menos dois dos critérios: 35 anos ou mais, um ou mais filhos, emprego com carteira assinada.')
) AS fixture(name, description)
WHERE tournament.slug = 'monomachia-a-confirmar-2027'
  AND NOT EXISTS (
      SELECT 1 FROM public.tournament_tags AS existing
      WHERE existing.tournament_id = tournament.id AND existing.name = fixture.name
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
