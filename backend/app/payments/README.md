# Shared payment records

**Created**: 2026-11-04
**Last updated**: 2026-11-04

Payments owns generic financial facts in BRL:

| Record | Fields |
| --- | --- |
| Payment | `amount_received`, `verified_by_user_id`, `verified_at` |
| Refund | `payment_id`, `amount_owed`, `obligated_at`, `refund_status`, `completed_at`, `completed_by_user_id` |

Neither model references tournaments, membership, fee schedules, eligibility, or
capacity. Payment facts and the refund's source, amount, and obligation time are
immutable. An `awaiting_refund` has no completion evidence. A `completed` refund
requires the actual time and recording UUID, with completion no earlier than the
obligation. The database checks evidence shape, not the actor's authorization.

`services/records.py` exposes `add_payment_record` and `add_refund_record`.
They add and flush rows in the supplied session. They never commit or open another
session. The consuming workflow authorizes the actor, applies its business rules,
and commits or rolls back its domain association and financial facts together.
These functions persist facts. They do not initiate or verify a bank transfer.

Tournaments owns settings, proof reviews, and RegistrationPayment / RegistrationRefund
associations. Its rules require an approved exact proof, one receipt, a full refund,
and a deadline. Generic refunds do not impose those tournament rules on other
consumers. See the [tournament guide](../tournaments/README.md#financial-evidence-records)
for associations and [decision 0009](../../../specs/decisions/0009-shared-payments-and-domain-associations.md)
for rationale and future membership reuse. Financial commands, provider integration,
other currencies, and membership billing are not implemented.
