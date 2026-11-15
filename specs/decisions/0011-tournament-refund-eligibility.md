# 0011: Tournament refund eligibility

**Created**: 2026-11-14
**Last updated**: 2026-11-14

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Source | Product-owner direction on 14 November 2026 |

## Decision

Monomachia 2027 is non-refundable. A tournament can offer athlete
self-service cancellation with refunds only when its cancellation policy
allows refunds.

Use a structured tournament setting such as `refunds_allowed`, defaulting to
false. Set it to false for Monomachia and enable it only for future tournaments
whose published policy permits refunds. The policy text and the setting must
agree. The backend exposes eligibility to the frontend and enforces it when
handling athlete cancellation. The athlete's cancellation control is hidden
when refunds are disabled.

## Consequences

For eligible tournaments, the existing manual refund flow applies. A verified
payment creates a refund for the full amount received, due 10 weekdays after
cancellation in fixed UTC−03:00. Staff records completion after transferring
the money. Previously recorded refund obligations and payment evidence remain
available if eligibility later changes.

This direction qualifies the paid-cancellation rule in
[REG-013](../tournaments/registration.md#rules) and
[PAY-009](../tournaments/payments-and-confirmation.md#rules). New refund
obligations from cancellation require a refundable tournament policy.
