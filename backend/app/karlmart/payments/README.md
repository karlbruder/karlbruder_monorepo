# Shared payment records

**Created**: 2026-11-04
**Last updated**: 2026-11-15

Payments owns generic financial facts in BRL:

| Record | Fields |
| --- | --- |
| Payment | `order_id`, `amount_received`, `verified_by_user_id`, `verified_at` |
| Refund | `payment_id`, `amount_owed`, `obligated_at`, `due_on`, `refund_status`, `completed_at`, `completed_by_user_id` |

Neither model references tournaments, membership, fee schedules, eligibility, or
capacity. Authorized database operators can correct payment and refund facts. An `awaiting_refund` has no completion evidence. A `completed` refund
requires the actual time and recording UUID, with completion no earlier than the
obligation. The database checks evidence shape, not the actor's authorization.

`services/records.py` exposes `add_payment_record` and `add_refund_record`.
They add and flush rows in the supplied session. They never commit or open another
session. The consuming workflow authorizes the actor, applies its business rules,
and commits or rolls back its domain association and financial facts together.
These functions persist facts. They do not initiate or verify a bank transfer.

Tournaments owns settings, proof reviews, and the link from an approved review to
its payment. Its rules require a full refund and a deadline. Generic refunds do
not impose tournament rules on other consumers. See the
[tournament guide](../../tournaments/README.md#financial-evidence-records).
Financial commands, provider integration, other currencies, and membership billing
are not implemented.
