# 0009: Shared financial records and domain associations

**Created**: 2026-11-04
**Last updated**: 2026-11-04

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Sources | Product-owner approval during [issue #69](https://github.com/karlbruder/karlbruder_monorepo/issues/69) of shared Payment/Refund records with domain-owned associations. Request to record the rationale on 4 November 2026 |

## Context

A tournament registration, uploaded proof, staff review and received payment are
different facts. A proof upload does not establish that money was received.
Cancellation does not establish that a refund was completed.

The first financial models were tied to registrations even though they lived in
payments. That boundary would make a future membership payment inherit tournament
references and rules, or require a second financial record design.

## Decision

Keep `Payment` and `Refund` in the separate `app/payments/` domain. They are
financial records with monetary and evidence constraints, rather than general
infrastructure for `core/`.

| Owner | Records and rules |
| --- | --- |
| Payments | Payment holds actual BRL amount received and verification actor/time. Refund holds source payment, amount owed, obligation time, status and completion evidence |
| Tournaments | TournamentPaymentSettings, PaymentProofReview, RegistrationPayment and RegistrationRefund. Own proof eligibility, same-registration association, full-refund amount, receipt/obligation uniqueness and deadline policy |

Shared Payment and Refund contain no tournament or member ID, reverse domain
relationship or polymorphic owner fields. Consuming domains point to them through
their own associations with real foreign keys.

The amount received is recorded independently of a tournament's configured fee.
The generic Refund does not impose the tournament rule that the entire received
amount must be refunded. That equality belongs to RegistrationRefund's domain
invariant.

## Tournament use today

PaymentProofReview identifies an exact submitted payment-proof document and its
staff decision. RegistrationPayment links a registration and its approved review
to a shared Payment. RegistrationRefund links that registration payment to a
shared Refund and retains the tournament deadline.

These records supply persistence for later staff workflows. Uploading a proof
does not create a review, Payment or Refund. The refactor does not add approval,
refund initiation, completion commands, notifications or money transfer.

When a tournament workflow records a financial outcome, it uses the shared payment
persistence service with its own database session. The helper adds and flushes
records, but never commits. The tournament workflow must commit the review,
financial facts, domain association and participation outcome atomically. Failed
work must roll back together. Authorization belongs to that workflow.

## Future use

A future membership capability could own dues, billing periods, member eligibility
and an association from a dues obligation to a shared Payment. If it supports
refunds, it could add its own association to Refund and apply its own refund policy.
Shared payments would not need to import membership or add a membership ID.

The dependency direction is `tournaments -> payments` today and could also be
`membership -> payments` later. Both depend on common infrastructure. Payments
does not depend on either consumer. Tournament proof reviews and Pix settings
remain tournament-owned unless another actual use justifies a different boundary.

This does not implement membership billing, recurring charges, installments,
multiple currencies, a payment gateway or an accounting ledger. The current
shared monetary contract is BRL. Reuse outside that contract needs a deliberate
extension rather than assuming the records already model every kind of payment.

## Alternatives and consequences

- Keeping registration IDs in shared financial records makes payments depend on
  its first consumer and couples unrelated future payments to tournaments.
- Moving all financial records into tournaments avoids that dependency today but
  duplicates received-money and refund facts when another consumer needs them.
- A generic owner-type/owner-ID pair hides the domain relationship from ordinary
  foreign keys and still does not define each consumer's business rules.
- Separate financial facts and domain associations add joins and require deliberate
  transaction orchestration. They keep money, evidence and participation separate.
- Shared persistence helpers are intentionally small. They are not a second layer
  of tournament commands or a promise of a universal billing framework.

## References

[Payments and confirmation](../tournaments/payments-and-confirmation.md),
[architecture](../architecture.md),
[shared payment models](../../backend/app/payments/models/payment.py),
[shared refund model](../../backend/app/payments/models/refund.py),
[persistence helpers](../../backend/app/payments/services/records.py),
[tournament payment association](../../backend/app/tournaments/models/registration_payment.py),
[tournament refund association](../../backend/app/tournaments/models/registration_refund.py).
