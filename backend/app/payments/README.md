# Shared payment records

**Created**: 2026-11-04
**Last updated**: 2026-11-04

Payment stores a verified received amount in BRL and the verifying UUID/time.
Refund stores its source payment, amount owed, obligation time and pending/completed
progress with actual completion evidence. Neither model references tournaments,
membership, a fee schedule, eligibility or capacity. Payment facts and refund
source/amount/obligation facts are immutable.

`services/records.py` exposes `add_payment_record` and `add_refund_record`.
They add and flush rows in the supplied session. They never commit or open another
session. The consuming workflow authorizes the actor, applies its business rules,
and commits or rolls back its domain association and financial facts together.
These functions persist facts. They do not initiate or verify a bank transfer.

Tournaments owns settings, proof reviews and RegistrationPayment / RegistrationRefund
associations. It enforces an approved exact proof, one receipt, a full refund and its
deadline. Generic refunds can represent a different amount without creating a
membership billing rule. Future membership may add its own associations.
No provider integration, currency expansion, financial command or membership feature
is delivered here.
