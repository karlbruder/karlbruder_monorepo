# Tournament capacity and waitlist

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial capacity protection and planned waitlist administration |
| Applications | frontend, backend |
| Sources | Product-owner [registration answers](registration.md); [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 4 and 8 |

## Goal

Keep confirmed participation within event limits and provide an explicit path for participants when seats are unavailable.

## Rules

- **CAP-001:** Guild staff (admins) configure the tournament's total competitor capacity and registration/payment dates. A null `max_competitor_capacity` means unlimited capacity until staff sets a limit. Initial capacity is tournament-level in the single-modality model. Registration runs from opening day through closing day in GMT-3. Per-category capacity is a future extension.
- **CAP-002:** New registrations start as `awaiting_payment` and do not reserve a seat, even when the tournament is full. `waitlist` is assigned after staff approves payment when no seat is available, not when the form is first submitted. A waitlist entry is not a confirmed seat.
- **CAP-003:** Every staff confirmation checks and assigns capacity transactionally, whether it follows payment approval or selection from the paid waitlist. Concurrent confirmations must not exceed configured capacity. Repeating confirmation must not allocate the same registration a second seat.
- **CAP-004:** Cancellation immediately releases any occupied seat, independently of refund progress. Repeating cancellation must not release the same seat twice. There is no pre-approval review reservation to expire.
- **CAP-005:** Guild staff (admins) decide who to select from the paid waitlist based on the event, participants, and available capacity. The system imposes no queue priority, automatic promotion, mandatory invitation/acceptance stage, or invitation-expiry rule. Staff decides whether to contact a participant before confirming them. Releasing or adding capacity does not itself promote anyone. Staff confirmation of a selected waitlisted participant requires an available seat and the ordinary eligibility checks; their payment is already approved.
- **CAP-006:** The UI accurately communicates registration availability, waitlist status, and confirmation. A displayed seat count cannot substitute for the backend allocation decision.
- **CAP-007:** Only confirmed participation consumes capacity. Neither `awaiting_payment` nor `payment_in_review` reserves a seat. Proof can be stored for manual review even when the event is full. Approval without an available seat produces `waitlist` and an email notification.
- **CAP-008:** The paid waitlist has no size limit. Staff may close new registrations to control queue growth and refund workload. When the event is full but registrations remain open, warn users before submission that payment approval will lead to the waitlist unless a seat becomes available. Form submission still starts in `awaiting_payment`.
- **CAP-009:** Reject any capacity change below the number already confirmed, including a change from unlimited capacity to a finite limit. This constraint applies to admins without an override. A rejected capacity edit must not cancel registrations or release seats. To lower capacity further, staff must first handle cancellations through the normal workflow.
- **CAP-010:** Staff may explicitly increase configured capacity, including when deciding whether to accept late Pix payments. The system never increases capacity automatically or confirms more participants than the configured limit. Late-payment acceptance or refund remains a staff judgment under PAY-006 and PAY-013.

## Confirmed allocation policy

The latest registration answers supersede issue #20's creation-time waitlisting and the earlier draft's review reservations. Registration and proof submission consume no capacity. Staff confirmation assigns a seat, either during payment approval or later when staff selects an already-paid waitlisted participant. Payment approval when the event is full produces a paid waitlist entry and notification email.

Storing evidence does not require an available seat. Cancellation releases a seat immediately, even while its refund is awaiting processing. Null capacity means unlimited; the waitlist is uncapped. Selecting and confirming a waitlisted participant is a staff judgment, with no system-enforced priority or automatic promotion.

## Acceptance criteria

- **CAP-AC-001:** Creating a valid registration when the event is full produces `awaiting_payment` without consuming capacity. Staff approval of payment without an allocatable seat produces `waitlist` rather than a confirmed seat.
- **CAP-AC-002:** With one confirmable seat remaining and two concurrent valid confirmation requests, at most one is confirmed.
- **CAP-AC-003:** Cancelling a confirmed registration releases its seat immediately. Repeating cancellation or later recording its refund does not release another seat.
- **CAP-AC-004:** Authorized staff may select a paid waitlisted participant regardless of queue position and confirm them if an eligible seat is available. No fixed invitation-acceptance or expiry stage is required by the system. Confirmation cannot overbook the event or allocate a second seat to the same registration.
- **CAP-AC-005:** A valid proof can be stored for manual review when the tournament is full, and `payment_in_review` consumes no capacity. Staff approval then produces waitlist status and an email rather than overbooking the event.
- **CAP-AC-006:** Null capacity permits confirmations without a finite seat limit; setting a finite limit still cannot put confirmed participation above it.
- **CAP-AC-007:** An admin capacity edit below confirmed participation is rejected without changing registration statuses or occupied seats.
- **CAP-AC-008:** An open, full event warns applicants about the paid waitlist. Explicit staff closure prevents new registrations through the backend; reaching capacity alone does not close them.
- **CAP-AC-009:** Cancellation or a capacity increase leaves waitlisted registrations unchanged until staff explicitly confirms a selected participant. Competing confirmations from payment review and waitlist selection share the same capacity check.

## Open questions

None for tournament-level capacity or waitlist selection. Staff discretion is the agreed policy under CAP-005; it is not an undecided automation rule.

Actual event capacity is [Tournament configuration](events/monomachia-2027.md#tournament-configuration). Late payments are decided manually under [payment rules](payments-and-confirmation.md#rules).

## Implementation decisions

Choose how to persist staff closure of new registrations; the supplied Tournament starting model has date windows but no explicit closure flag. Closure is an independent business control and must not be inferred from full capacity. Implement waitlist selection as a staff action with authorization, actor/time audit evidence, and transactional capacity checks. Automatic participant selection, promotion, and invitation expiry are outside the agreed policy.

## Deferred questions

- **CAP-Q5:** If category-specific limits are introduced, how should they interact with the tournament's total capacity?

## Related specifications

[Catalog](catalog.md), [registration](registration.md), [payments](payments-and-confirmation.md), [administration](administration.md), [communications](communications.md).
