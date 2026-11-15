# Configure tournament registration products

**Created**: 2026-11-14
**Last updated**: 2026-11-14

Use the Supabase SQL editor for the intended environment. Staff product management
is not available yet. Confirm the tournament ID and check for existing offerings
before writing. Run this setup once for an empty Monomachia catalog. Do not rerun
it to change prices. Purchased prices and order items preserve purchase history.

1. Select the intended Supabase project and confirm the tournament.

   ```sql
   SELECT id, name, slug FROM public.tournaments ORDER BY id;
   SELECT tp.id, p.name, p.is_active
   FROM public.tournament_products tp
   JOIN public.products p ON p.id = tp.product_id
   WHERE tp.tournament_id = <tournament_id>;
   ```

2. Replace `<tournament_id>` with the verified integer. Run the transaction only
   if the three offerings do not already exist for that tournament.

   ```sql
   BEGIN;
   WITH products AS (
     INSERT INTO public.products (name, description)
     VALUES
       ('Inscrição Social', 'Participação e troféu em caso de vitória. Não inclui outras premiações, cupons ou brindes de patrocinadores.'),
       ('Inscrição Plena', 'Participação, premiações para ganhadores e distribuição de cupons e brindes de patrocinadores.'),
       ('Inscrição Plus', 'Benefícios da Plena e pacote com camiseta, brindes e café da manhã. Conteúdo completo a confirmar.')
     RETURNING id, name
   ), offerings AS (
     INSERT INTO public.tournament_products (tournament_id, product_id)
     SELECT <tournament_id>, id FROM products
   )
   INSERT INTO public.prices (product_id, amount, currency, is_active)
   SELECT id, CASE name
     WHEN 'Inscrição Social' THEN 50.00
     WHEN 'Inscrição Plena' THEN 100.00
     WHEN 'Inscrição Plus' THEN 200.00
   END, 'BRL', true
   FROM products;
   COMMIT;
   ```

3. Check each offering and its latest active price before opening registration.
   This query follows the same latest-active-price selection as the application.

   ```sql
   SELECT tp.id AS tournament_product_id, p.name, p.description,
          p.is_active, price.id AS price_id, price.amount, price.currency
   FROM public.tournament_products tp
   JOIN public.products p ON p.id = tp.product_id
   LEFT JOIN LATERAL (
     SELECT id, amount, currency FROM public.prices
     WHERE product_id = p.id AND is_active
     ORDER BY id DESC LIMIT 1
   ) price ON true
   WHERE tp.tournament_id = <tournament_id>
   ORDER BY tp.id;
   ```

   Confirm that Social, Plena, and Plus are active and show BRL 50.00, 100.00,
   and 200.00 respectively. Confirm the descriptions with the event organizer.
   An offering without an active price cannot be selected.

For a future price change, insert a new active `public.prices` row for the same
product and verify that it is the latest active price. Do not edit a purchased
price. Existing registrations continue using their order-item snapshots.
