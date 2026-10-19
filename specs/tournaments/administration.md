# Tournament administration

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Guild staff payment review for the first release; broader administration and exports later |
| Applications | frontend, backend |
| Sources | Product-owner overview; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 6, 8, and 11 |

## Goal

Give guild staff (admins) control over tournament participation, payment review, and operational information.

## Rules

- **ADM-001:** Authenticated guild staff (admins) have full application access across all tournaments, including event editing, payment review, private proofs and safety data, exports, and results management when delivered. There are no event-specific admin grants. Domain constraints still apply to administrative actions.
- **ADM-002:** Guild staff can view registrations, search by name, school, city, or inscription number, and filter by supported status and category.
- **ADM-003:** Authorized staff may correct any registration field at any time, including after confirmation, without a participant-notification requirement for the correction itself. They may review eligibility, record internal notes, and review payments. All corrections remain subject to ownership, uniqueness, capacity, and lifecycle constraints.
- **ADM-004:** Status changes obey the [registration lifecycle](registration.md#lifecycle-boundary), manual staff approval, and capacity rules. A generic status-edit field must not bypass those constraints. Rejected evidence records a reason, notifies the participant, and permits resubmission under PAY-004. The absence of a correction notification does not suppress required workflow notifications.
- **ADM-005:** Changes to registration, payment, capacity, and sensitive operational data are attributable to an actor and timestamp. Keep the admin audit history under PRIV-011's interim indefinite-retention policy. Exact audit fields and storage are implementation choices.
- **ADM-006:** Staff chooses whom to select and confirm from the paid waitlist under CAP-005; no queue priority or automatic invitation deadline constrains that judgment. Confirmation still requires eligibility and available capacity. Staff also manages cancellations and refunds. Cancellation immediately releases any occupied seat. Unpaid cancellation produces `cancelled` without a refund; paid cancellation shows `awaiting_refund`. Staff records the actual completed refund before refund confirmation is emailed to the user. A refund record does not mean money has automatically moved through a provider.
- **ADM-007:** Planned exports include CSV/Excel, attendance lists, bracket-preparation lists, and HEMA Ratings data. Each export needs a defined purpose and field projection. Safety notes and payment proofs are excluded from general exports.
- **ADM-008:** Event rules, payment instructions, and communication templates should be maintainable by authorized staff where the relevant capability is delivered. Their editing and versioning rules must preserve prior acceptance records.
- **ADM-009:** Cancelled registrations may be reopened only by admins manually in the Supabase UI. Reopening is not an application control and must preserve the non-cancelled uniqueness and confirmed-capacity invariants. A cancelled registration otherwise permits a new signup for the same tournament.
- **ADM-010:** Staff may close new registrations even while the registration window is open. Staff cannot reduce configured capacity below confirmed participation; no admin override or automatic cancellation bypasses that invariant. Tournament-fact changes notify registrants only for the fields specified by CAT-008.
- **ADM-011:** Staff decides whether to accept a late Pix transfer or decline participation and arrange a refund. Staff may explicitly increase capacity before confirming additional participants. The deadline does not force a decision, and admin discretion does not bypass the configured capacity limit or refund-recording requirements.

## Lifecycle boundary

The initial registration states are `awaiting_payment`, `payment_in_review`, `confirmed`, `waitlist`, and `cancelled`. The latest registration answers add the displayed `awaiting_refund` status for cancelled participation after payment. Only confirmation consumes capacity; review does not. Cancellation and refund progress must remain distinguishable so an outstanding refund does not block a new signup. Broader documentation/refusal outcomes remain to be designed rather than inferred as mandatory enum values.

Confirmation allocates a seat after the requirements applicable at that stage are met. Event-day checks remain separate: confirming a minor's registration does not waive the identity-document check and parental accompaniment required at the event by PRIV-010.

## Acceptance criteria

- **ADM-AC-001:** A non-admin participant cannot list complete private registration records, access staff notes, or change another participant's status. The limited participant directory under PRIV-006 is a separate permitted projection.
- **ADM-AC-002:** Authorized staff can find a registration by inscription number and review the permitted data and evidence.
- **ADM-AC-003:** A confirmation request failing payment, eligibility, documentation, or capacity requirements does not confirm a seat.
- **ADM-AC-004:** A staff administrative change records the actor and time without copying private proof contents into general logs.
- **ADM-AC-005:** An export contains only its agreed fields and excludes restricted safety notes and payment proofs.
- **ADM-AC-006:** A guild admin can manage any tournament without a separate event assignment.
- **ADM-AC-007:** An admin can correct registration data after confirmation without a correction email, while invalid duplicates and capacity/lifecycle violations are still rejected.

## Open questions

None. Registration corrections, payment review, capacity, cancellation, reopening, and refund progress follow the rules above and the linked capability specifications. PROD-011 requires authorized payment review for the first release and defers the full administration suite.

## Deferred questions

- **ADM-Q2:** Which formats and exact fields are needed for later attendance, bracket-preparation, CSV/Excel, and HEMA Ratings exports?

Audit-record retention follows [privacy rules](consent-and-privacy.md#rules). Audit storage and implementation belong in the delivery plan.

## Related specifications

[Identity](../identity/authentication-and-access.md), [registration](registration.md), [payments](payments-and-confirmation.md), [capacity](capacity-and-waitlist.md), [results](results.md), [privacy](consent-and-privacy.md).
