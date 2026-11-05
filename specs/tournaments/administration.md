# Tournament administration

**Created**: 2026-10-17
**Last updated**: 2026-11-05

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Guild staff tournament configuration and payment review; broader administration and exports later |
| Applications | frontend, backend |
| Sources | Product-owner overview; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 6, 8, and 11 |

## Goal

Give guild staff (admins) control over tournament participation, payment review, and operational information.

## Rules

- **ADM-001:** Authenticated guild staff (admins) have full application access across all tournaments, including event editing, payment review, private proofs and safety data, exports, and results management when delivered. There are no event-specific admin grants. Domain constraints still apply to administrative actions.
- **ADM-002:** Guild staff can view registrations, search by name, school, city, or registration number, and filter by supported status and category.
- **ADM-003:** Authorized staff may correct any registration field at any time, including after confirmation, without a participant-notification requirement for the correction itself. They may review eligibility, record internal notes, and review payments. All corrections remain subject to ownership, uniqueness, capacity, and lifecycle constraints.
- **ADM-004:** Status changes obey the [registration lifecycle](registration.md#lifecycle-boundary), manual staff approval, and capacity rules. A generic status-edit field must not bypass those constraints. Rejected evidence records a reason, notifies the participant, and permits resubmission under PAY-004. The absence of a correction notification does not suppress required workflow notifications.
- **ADM-005:** A general administrative audit history is not required. Payment-proof review decisions retain the reviewer and decision time as part of the review workflow.
- **ADM-006:** Staff chooses whom to select and confirm from the paid waitlist under CAP-005; no queue priority or automatic invitation deadline constrains that judgment. Confirmation still requires eligibility and available capacity. Staff also manages cancellations and refunds. Cancellation immediately releases any occupied seat. Unpaid cancellation produces `cancelled` without a refund; paid cancellation shows `awaiting_refund`. Staff records the actual completed refund before refund confirmation is emailed to the user. A refund record does not mean money has automatically moved through a provider.
- **ADM-007:** Planned exports include CSV/Excel, attendance lists, bracket-preparation lists, and HEMA Ratings data. Each export needs a defined purpose and field projection. Safety notes and payment proofs are excluded from general exports.
- **ADM-008:** Event rules, payment instructions, and communication templates should be maintainable by authorized staff where the relevant capability is delivered. Their editing and versioning rules must preserve prior acceptance records.
- **ADM-009:** Cancelled registrations may be reopened only by admins manually in the Supabase UI. Reopening is not an application control and must preserve the non-cancelled uniqueness and confirmed-capacity invariants. A cancelled registration otherwise permits a new registration for the same tournament.
- **ADM-010:** Staff may close new registrations even while the registration window is open. Staff cannot reduce configured capacity below confirmed participation; no admin override or automatic cancellation bypasses that invariant. Notifications for tournament-fact changes are deferred under CAT-008.
- **ADM-011:** Staff decides whether to accept a late Pix transfer or decline participation and arrange a refund. Staff may explicitly increase capacity before confirming additional participants. The deadline does not force a decision, and admin discretion does not bypass the configured capacity limit or refund-recording requirements.

## Lifecycle boundary

The initial registration states are `awaiting_payment`, `awaiting_payment_confirmation`, `confirmed`, `waitlist`, and `cancelled`. Paid cancellation is still `registration_status = cancelled`. Its RegistrationRefund links a shared Refund with separate `awaiting_refund` or `completed` progress. Only confirmation consumes capacity; review does not. Cancellation and refund progress must remain distinguishable so an outstanding refund does not block a new registration. Broader documentation/refusal outcomes remain to be designed rather than inferred as mandatory enum values.

Confirmation allocates a seat after the requirements applicable at that stage are met. Event-day checks remain separate: confirming a minor's registration does not waive the identity-document check and parental accompaniment required at the event by PRIV-010.

Tournaments retains PaymentProofReview and the RegistrationPayment /
RegistrationRefund associations separately from TournamentRegistration. Payments
retains shared Payment and Refund financial facts. Staff decisions must
identify the exact proof, actual received amount and attributable actor/time.
No review, receipt or refund row changes capacity or participation by itself.
The payment-review command applies those facts and participation atomically.
It confirms when capacity permits and records paid waitlist otherwise. Rejection
records its reason and returns to awaiting payment without cancelling participation.
Waitlist selection, cancellation, and refund commands remain unimplemented. The records alone do not fulfill the administration requirements above.

## Acceptance criteria

- **ADM-AC-001:** A non-admin participant cannot list complete private registration records, access staff notes, or change another participant's status. The limited participant directory under PRIV-006 is a separate permitted projection.
- **ADM-AC-002:** Authorized staff can find a registration by registration number and review the permitted data and evidence.
- **ADM-AC-003:** A confirmation request failing payment, eligibility, documentation, or capacity requirements does not confirm a seat.
- **ADM-AC-004:** A payment-proof review records the reviewer and decision time without copying private proof contents into general logs.
- **ADM-AC-005:** An export contains only its agreed fields and excludes restricted safety notes and payment proofs.
- **ADM-AC-006:** A guild admin can manage any tournament without a separate event assignment.
- **ADM-AC-007:** An admin can correct registration data after confirmation without a correction email, while invalid duplicates and capacity/lifecycle violations are still rejected.

## Open questions

None. Registration corrections, payment review, capacity, cancellation, reopening, and refund progress follow the rules above and the linked capability specifications. PROD-011 requires authorized payment review for the first release and defers the full administration suite.

## Deferred questions

- **ADM-Q2:** Which formats and exact fields are needed for later attendance, bracket-preparation, CSV/Excel, and HEMA Ratings exports?

## Related specifications

[Identity](../identity/authentication-and-access.md), [registration](registration.md), [payments](payments-and-confirmation.md), [capacity](capacity-and-waitlist.md), [results](results.md), [privacy](consent-and-privacy.md).

## Staff tournament configuration

Staff APIs list, read, create, replace, and delete tournament configurations.
Payment settings are visible only to staff. The last staff save replaces the
configuration. Deletion is rejected when any registration exists, including a
cancelled registration or after registrations close. Future match results must also prevent
deletion. Capacity cannot be reduced below confirmed participation.

## Staff payment-review evidence

Admins can read pending work across all tournaments with
`GET /api/staff/tournaments/payment-reviews`. The queue supports `limit` (1–100),
`offset`, and an optional exact `registration_number`. It includes only registrations
in `awaiting_payment_confirmation` whose latest proof has no decision. Results are ordered by
current proof ID. The queue excludes contact, identity, safety, and storage fields.

`GET /api/staff/tournaments/payment-reviews/{registration_number}` returns the staff
registration projection, fee, deadline, equipment requirements, capacity, confirmed
count, proof versions, parental form metadata, and review history. Decided records
remain readable. Reads do not allocate seats or record decisions.

`GET /api/staff/tournaments/payment-reviews/{registration_number}/documents/{document_id}/download-url`
issues a short-lived URL only for a proof or parental form belonging to that
registration. Metadata reads do not call storage. Unknown registrations and mismatched
documents return 404. Storage failures return 503. Guests receive 401 and authenticated
non-admins receive 403 on all three endpoints. Owner proof access remains latest-only.


## Staff payment-review screens

The signed-in staff entry is `/staff/payment-reviews`. It lists pending proofs
across tournaments, supports exact registration-number search and pagination,
and links to `/staff/payment-reviews/{registration_number}`. The home screen
shows this entry for admins. The backend remains the authorization boundary.

The review screen shows the latest proof, earlier versions, parental forms,
registration eligibility, capacity context, and attributable review history.
Document links are requested on demand and can be renewed. Staff enters the
actual BRL amount and acknowledges receipt and applicable requirements before
approval. Rejection requires a reason, which is shared with the participant.

The screen submits the displayed proof ID. A conflict preserves draft fields
and blocks submission until staff refreshes and checks the evidence again.
The saved response determines confirmed participation or paid waitlist.
Email failure is shown separately from a saved decision. A late deadline does
not disable review. Portuguese and English interface copy is available.

This screen does not provide cancellation, refunds, waitlist selection, generic
status editing, registration corrections, or exports.

Selecting and confirming an already-paid participant remains a known gap for a
future staff administration issue. Payment approval can still add participants
to the paid waitlist in this release.
