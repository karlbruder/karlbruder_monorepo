# Tournament payments and confirmation

**Created**: 2026-10-17
**Last updated**: 2026-11-14

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial manual payment review; future payment-provider integration |
| Applications | frontend, backend |
| Sources | Product-owner overview and [registration answers](registration.md); [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 4 and 5 |

## Goal

Let participants submit evidence of payment and let guild staff (admins) validate it before confirming tournament participation.

## Rules

- **PAY-001:** Until an official payment gateway is implemented, Pix is the only accepted payment method. Registration products have prices in BRL. The order item retains the agreed amount. Pix key and receiving account are operational payment configuration, not values hardcoded in these specs.
- **PAY-002:** A participant can submit proof for a registration they are authorized to manage. The backend validates access, file type, and size. Proofs use restricted Amazon S3 storage in production and Ministack S3 emulation locally. They are not public site files.
- **PAY-003:** Upload success means evidence was stored for manual guild-staff review. Neither uploading proof nor `awaiting_payment_confirmation` reserves a seat, including when the event is full. Uploading a file does not initiate or verify a money transfer; the initial payment is made to the guild outside the platform.
- **PAY-004:** Guild staff (admins) review payment evidence and record decisions. Rejection records a reason, shows a rejected-evidence outcome and message to the participant, and notifies them. The participant may submit another proof for review. Rejection does not confirm a seat or cancel participation by itself. Representing the review outcome separately from registration status is an implementation decision.
- **PAY-005:** Guild staff manually approves payment. If the registration meets participation requirements and a seat is available, approval confirms the registration and assigns that seat atomically. If the tournament is full, the registration becomes `waitlist` and the user is notified by email. There is no seat reservation before confirmation.
- **PAY-006:** When a payment deadline applies, the participant sees it. A Pix transfer after `payment_due_at` remains a manual staff decision: staff may accept it or decline participation. A refund obligation follows only when the tournament allows refunds. The deadline alone must not automatically approve, reject, cancel, refund, or block staff review. Waitlist call-up rules belong in the capacity specification. Review reservations and their expiry are not part of this flow.
- **PAY-007:** Payment proofs and sensitive registration data are not attached to notification emails or exposed through public links.
- **PAY-008:** Future gateway integration belongs in the backend. Provider-reported payment status and business confirmation remain separate decisions. Tournament fees and association dues retain distinct rules.
- **PAY-009:** Cancellation ends participation and releases any occupied seat immediately. It records `awaiting_refund` only when a verified payment exists and the tournament policy allows refunds. Tournament eligibility defaults to off. Changing eligibility does not affect existing refund obligations. See [ADR 0011](../decisions/0011-tournament-refund-eligibility.md). Guild staff refunds the payment and records completion before the participant receives a refund-confirmation email. The platform does not automatically transfer the refund.
- **PAY-010:** Accept PDF, JPEG, and PNG proofs up to 10 MB each. Validate file type and size in the backend before accepting the upload.
- **PAY-011:** Participants may replace submitted proof. Keep every submitted proof in restricted object storage for staff review. The participant sees only the latest submission. Each replacement is new evidence requiring review, not proof of approval. Proof retention follows the privacy policy.
- **PAY-012:** For a refundable tournament, refund the exact amount the guild received within 10 business days of paid-registration cancellation. Count weekdays starting the day after cancellation in fixed UTC-03:00. Ignore holidays. Staff records actual refund completion; cancellation alone does not fulfill the deadline or mark funds returned.
- **PAY-013:** Accepting a late payment follows the ordinary capacity rules: confirmation requires an available seat; otherwise approved payment produces a paid waitlist entry. Staff may explicitly increase configured capacity before confirming more participants. The system neither increases capacity automatically nor confirms beyond it. Declining participation after an actual late transfer uses staff cancellation. A verified payment creates a refund obligation only if the tournament allows refunds. Rejecting proof alone is a different evidence-review action.

## Persistence contract

Each registration references its tournament product and order item. The order item
retains the agreed product details and price. Each verified payment belongs to its
order. Approval changes the order from `pending` to `paid` in the same transaction
as the review and participation outcome.

| Record | Evidence retained |
| --- | --- |
| TournamentRegistrationDocument | One submitted proof and its StoredFile reference. |
| PaymentProofReview | Exact document, decision, reviewer, time, and rejection reason when rejected. |
| PaymentProofPayment | Approved review and payment for the same registration order. |
| Payment | Order, actual BRL amount received, verifier, and verification time. |
| Refund | Payment, amount owed, obligation time, deadline, status, and completion evidence. |

The application retains reviews, receipts, proof associations and submitted files.
A tournament payment may have one refund obligation equal to the amount received.
The deadline is calculated by tournaments. `awaiting_refund` and `completed` are
separate states. Completion requires the actual time and recording admin.
Authorized database operators can correct records directly. Corrections must keep
related payment and refund values consistent and account for money already returned.

The API supports proof submission, authorized retrieval, and exact-proof staff
approval/rejection. Approval atomically saves the review, shared receipt, association,
and confirmed or paid-waitlist outcome. Rejection returns to `awaiting_payment`
with a separate current-proof review and reason. Only a new proof can be reviewed
after rejection. Cancellation atomically records an obligation when the tournament
allows refunds and a receipt linked to approved proof for that registration exists.
An unlinked receipt requires staff reconciliation before cancellation can create an obligation. It uses the exact amount received and the deadline under PAY-012.
A submitted proof alone does not create a receipt. The participant can see a
pending or completed refund and its deadline separately from cancelled
participation. Staff can find outstanding refunds across tournaments, check the
payment evidence, and record the actual transfer time after returning the full
amount outside the platform. Completion retains the recording admin and attempts
the confirmation email after commit.

If a submitted proof is still pending when participation is cancelled, staff can
review it in the payment queue. Approval records the receipt without restoring
participation. If refunds were allowed at cancellation, approval also creates a
full refund obligation dated from cancellation. Rejection leaves participation
cancelled. The refund queue only tracks obligations backed by verified receipts.

## Initial journey

For a registration in `awaiting_payment`, the application shows the amount, configured instructions, and deadline when known. A valid proof is stored for manual review, including when the event is full. `awaiting_payment_confirmation` does not consume capacity. Staff approval with an available seat produces `confirmed` and assigns the seat; approval without a seat produces `waitlist` and an email notification.

When payment details show an approved review, the participant is not prompted to pay or submit proof again, even if the displayed registration status is awaiting an update. The application refreshes that status. The agreed order-item price is authoritative before payment is recorded. The order item price is retained with the registration.

When payment details show that the current proof was rejected, the participant sees the reason and can submit a new proof even while an older registration status is being refreshed. A successful proof submission immediately updates an awaiting-payment registration to awaiting review. A temporary registration refresh failure leaves the previously loaded payment details visible and offers a retry. Access denial or a missing registration still hides those details.

Waitlisted participants have already had payment approved. Staff later selects and confirms a waitlisted participant under CAP-005 without requiring another payment approval. The system does not choose the participant or impose an invitation/payment stage. Submitted proof is evidence of payment to the guild, not funds held by an application wallet or gateway. Cancelled participation remains inactive while refund progress is tracked, so an outstanding refund does not block a replacement registration under the registration rules.

## Acceptance criteria

- **PAY-AC-001:** A participant sees the configured instructions and can upload an allowed proof for their authorized registration.
- **PAY-AC-002:** A rejected file creates no accepted proof, and the participant sees a useful error.
- **PAY-AC-003:** Uploading proof alone never produces a confirmed registration.
- **PAY-AC-004:** An unauthorized user cannot view, upload, or replace another participant's proof.
- **PAY-AC-005:** A payment-review decision is attributable to the authorized reviewer and time, and confirmation still respects capacity.
- **PAY-AC-006:** A configured payment deadline is shown. Passing it does not automatically reject a late Pix transfer or prevent staff from reviewing it and deciding whether to accept or decline participation.
- **PAY-AC-007:** Staff approval of payment without an allocatable seat records a paid waitlist outcome and sends an email rather than confirming participation.
- **PAY-AC-008:** Cancellation does not claim that a refund has been completed. Recording the completed guild refund triggers a refund-confirmation email to the user.
- **PAY-AC-009:** Cancellation creates an obligation only for a verified payment in a refundable tournament. Disable athlete cancellation when refunds are off. Staff cancellation still releases any occupied seat immediately.
- **PAY-AC-010:** PDF, JPEG, and PNG files at or below 10 MB are accepted; disallowed types and larger files are rejected without an accepted upload.
- **PAY-AC-011:** After replacement, the participant can retrieve only the latest proof while authorized staff can review all submitted versions.
- **PAY-AC-012:** Rejecting evidence records and displays the reason, notifies the participant, and allows resubmission without assigning a seat.
- **PAY-AC-013:** A paid cancellation for an eligible tournament records a refund obligation equal to the amount received and a deadline 10 business days after cancellation.
- **PAY-AC-014:** Staff can accept a late payment subject to available capacity, or decline participation through staff cancellation, with a refund obligation only for a refundable tournament. A capacity increase must be explicit; no late-payment decision silently overbooks the event.

## Open questions

None for the initial manual-payment flow. Late transfers are judged by staff under PAY-006 and PAY-013, not an automatic deadline policy. Non-refundable tournaments do not create a refund obligation for declined late transfers.

Event products and dates are [Tournament configuration](events/monomachia-2027.md#tournament-configuration). Retention is defined in [privacy rules](consent-and-privacy.md#rules). Bucket and SDK configuration belong in the [storage implementation decisions](../platform/data-storage.md#implementation-and-operations-decisions).

## Deferred questions

- **PAY-Q6:** Which provider and payment methods should the future gateway integration support?

Provider verification and duplicate-callback handling are engineering design topics once that future provider is chosen.

## Related specifications

[Registration](registration.md), [capacity](capacity-and-waitlist.md), [administration](administration.md), [privacy](consent-and-privacy.md), [communications](communications.md), [membership](../membership/overview.md).
