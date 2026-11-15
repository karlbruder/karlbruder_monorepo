# Database triggers and functions

**Created**: 2026-11-14
**Last updated**: 2026-11-14

Alembic manages these application-owned PostgreSQL triggers and functions in
the `public` schema. The
[initial migration](../backend/alembic/versions/20261103_0001_initial_domain_schema.py)
and the [Karlmart migration](../backend/alembic/versions/20261114_0001_add_karlmart_schemas.py)
create them. Supabase-managed objects are outside this inventory.

## Design policy

Triggers, functions, and procedures are an exception, not the default. Prefer
application services and ordinary constraints. Database guards are a concession
for immutable evidence. Document each guard's invariant, alternatives, locking,
and tests. Remove a guard when a simpler design provides the same guarantee.
Services retain authorization and workflow rules.

## Active triggers

All triggers below run before the stated row operation. `immutable_evidence` is
reused as a trigger name on several different tables.

| Table | Trigger | Operation | Function | Purpose and reason |
| --- | --- | --- | --- | --- |
| `registration_acceptances` | `immutable_evidence` | Update, delete | `reject_evidence_mutation` | Preserve accepted declarations and their recorded evidence. A check constraint cannot compare old and new rows or forbid deletion. |
| `archived_files` | `immutable_evidence` | Update, delete | `reject_evidence_mutation` | Preserve archived-content references and capture evidence. |
| `payment_proof_reviews` | `immutable_evidence` | Update, delete | `reject_evidence_mutation` | Preserve the decision, actor, time, and reviewed proof. |
| `payments` | `immutable_evidence` | Update, delete | `reject_evidence_mutation` | Preserve verified receipt facts and their order link. |
| `payment_proof_payments` | `immutable_evidence` | Update, delete | `reject_evidence_mutation` | Prevent replacing or removing the link between a review and payment. |
| `orders` | `immutable_order_owner` | Update | `protect_order_owner` | Keep the order owner fixed, including before an item is added. This preserves purchase attribution without a conditional cross-table race. |
| `order_items` | `immutable_order_item` | Update, delete | `reject_evidence_mutation` | Preserve the purchased product and price snapshot. |
| `stored_files` | `immutable_archived_file` | Update, delete | `protect_archived_file_metadata` | Keep an archived file's storage metadata from being redirected or deleted. This depends on whether an archive references the file. |
| `stored_files` | `immutable_reviewed_proof_file` | Update, delete | `protect_reviewed_proof_file` | Preserve the storage metadata behind a reviewed proof. This depends on whether a review references the file. |
| `tournament_registration_documents` | `immutable_reviewed_document` | Update, delete | `protect_reviewed_document` | Prevent a reviewed document association from being changed or deleted. Unreviewed documents are not covered by this guard. |
| `payment_proof_reviews` | `valid_proof_review` | Insert | `validate_payment_proof_review` | Require a payment-proof document and lock its document and file while creating a review. A foreign key alone cannot check the document purpose. |
| `payment_proof_payments` | `valid_payment_proof` | Insert | `validate_payment_proof_payment` | Require an approved proof for the same registration order as the payment. It locks the referenced review, document, registration, order item, and payment. |
| `refunds` | `immutable_refund_obligation` | Update | `protect_refund_obligation` | Keep the source payment, amount, obligation time, and deadline fixed. Completion fields remain editable subject to their constraints. |
| `refunds` | `valid_tournament_refund` | Insert | `validate_tournament_refund` | For tournament orders, require the full received amount and at most one refund. It locks the payment while checking existing refunds. |
| `tournament_registrations` | `valid_registration_order` | Insert, update | `validate_registration_order` | Match the tournament product, price's product, order owner, and quantity. It locks the offering while validating and prevents changing the registration's purchase references and owner. |
| `tournament_products` | `immutable_purchased_tournament_product` | Update | `protect_purchased_tournament_product` | Prevent changing the tournament or product of an offering referenced by a registration. |
| `prices` | `immutable_purchased_price` | Update | `protect_purchased_price` | Prevent changing a purchased price's product, amount, or currency. Deactivation remains allowed. |
| `order_items` | `valid_order_item_price` | Insert | `lock_order_item_price` | Require the item amount and currency to match the referenced price and lock that price during insertion. |

## Downgrade-only functions

The Karlmart migration removes the unused `validate_registration_payment` and
`validate_registration_refund` functions after dropping their association tables.
Its downgrade recreates the functions and their triggers for the earlier schema.

There are no application-defined stored procedures in these migrations. The
functions above are trigger functions. Application services do not call them as
stored procedures.

## Inspect a database

The following read-only queries list user-defined triggers and routines in
`public`. Results may include objects created outside Alembic. Compare them with
the intended migrations and the database's Alembic revision.

```sql
SELECT c.relname AS table_name, t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger AS t
JOIN pg_class AS c ON c.oid = t.tgrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

```sql
SELECT p.proname AS routine_name, p.prokind AS kind,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
ORDER BY p.proname, arguments;
```

`kind` is `f` for a function and `p` for a procedure. Check the function body and
trigger enabled state when investigating a mismatch. Alembic schema comparison
does not verify trigger bodies. Test guards against migrated PostgreSQL.

These guards protect ordinary writes while enabled. Privileged operators can
change or disable them. They do not make stored files tamper-proof or replace
access control, backups, or application-level validation.
