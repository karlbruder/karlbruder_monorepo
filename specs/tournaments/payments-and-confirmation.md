# Tournament payments and confirmation

**Created**: 2026-10-17
**Last updated**: 2026-11-05

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial manual payment review; future payment-provider integration |
| Applications | frontend, backend |
| Sources | Product-owner overview and [registration answers](registration.md); [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 4 and 5 |

## Goal

Let participants submit evidence of payment and let guild staff (admins) validate it before confirming tournament participation.

## Rules

- **PAY-001:** Until an official payment gateway is implemented, Pix is the only accepted payment method. Fees are configured through Tournament `registration_fee_amount`, always in BRL. Pix key and receiving account are operational payment configuration, not values hardcoded in these specs.
- **PAY-002:** A participant can submit proof for a registration they are authorized to manage. The backend validates access, file type, and size. Proofs use restricted Amazon S3 storage in production and Ministack S3 emulation locally. They are not public site files.
- **PAY-003:** Upload success means evidence was stored for manual guild-staff review. Neither uploading proof nor `awaiting_payment_confirmation` reserves a seat, including when the event is full. Uploading a file does not initiate or verify a money transfer; the initial payment is made to the guild outside the platform.
- **PAY-004:** Guild staff (admins) review payment evidence and record decisions. Rejection records a reason, shows a rejected-evidence outcome and message to the participant, and notifies them. The participant may submit another proof for review. Rejection does not confirm a seat or cancel participation by itself. Representing the review outcome separately from registration status is an implementation decision.
- **PAY-005:** Guild staff manually approves payment. If the registration meets participation requirements and a seat is available, approval confirms the registration and assigns that seat atomically. If the tournament is full, the registration becomes `waitlist` and the user is notified by email. There is no seat reservation before confirmation.
- **PAY-006:** When a payment deadline applies, the participant sees it. A Pix transfer after `payment_due_at` remains a manual staff decision: staff may accept it or decline participation and arrange a refund. The deadline alone must not automatically approve, reject, cancel, refund, or block staff review. Waitlist call-up rules belong in the capacity specification. Review reservations and their expiry are not part of this flow.
- **PAY-007:** Payment proofs and sensitive registration data are not attached to notification emails or exposed through public links.
- **PAY-008:** Future gateway integration belongs in the backend. Provider-reported payment status and business confirmation remain separate decisions. Tournament fees and association dues retain distinct rules.
- **PAY-009:** Cancellation before payment produces `cancelled` without a refund due. Cancellation after payment ends participation and shows `awaiting_refund`. Either releases any occupied seat immediately. Guild staff refunds the payment and records completion before the participant receives a refund-confirmation email. The platform does not automatically transfer the refund.
- **PAY-010:** Accept PDF, JPEG, and PNG proofs up to 10 MB each. Validate file type and size in the backend before accepting the upload.
- **PAY-011:** Participants may replace submitted proof. Keep every submitted proof in restricted object storage for staff audit; the participant sees only the latest submission. Each replacement is new evidence requiring review, not proof of approval. Proof retention follows the privacy policy.
- **PAY-012:** Refund the exact amount the guild received, within 10 business days of paid-registration cancellation. Staff records actual refund completion; cancellation alone does not fulfill the deadline or mark funds returned.
- **PAY-013:** Accepting a late payment follows the ordinary capacity rules: confirmation requires an available seat; otherwise approved payment produces a paid waitlist entry. Staff may explicitly increase configured capacity before confirming more participants. The system neither increases capacity automatically nor confirms beyond it. Declining participation after an actual late transfer uses the paid cancellation/refund workflow; rejecting proof alone is a different evidence-review action.

## Persistence contract

These records keep distinct facts. Their presence alone does not change
participation, consume capacity, send a message or move money.

| Record | Evidence retained |
| --- | --- |
| TournamentRegistrationDocument | One exact submitted proof and its StoredFile reference. |
| PaymentProofReview | `document_id`, approved/rejected `decision`, `reviewed_by_user_id`, `reviewed_at` and a nonblank `rejection_reason` when rejected. |
| RegistrationPayment, tournaments | `registration_id`, approved `proof_review_id`, unique shared `payment_id`. |
| Payment, payments | Actual BRL `amount_received`, `verified_by_user_id`, `verified_at`. No registration or membership reference. |
| RegistrationRefund, tournaments | `registration_payment_id`, unique shared `refund_id`, deadline `due_on`. |
| Refund, payments | `payment_id`, `amount_owed`, `obligated_at`, `refund_status`, `completed_at` / `completed_by_user_id`. |

TournamentPaymentSettings and PaymentProofReview belong to tournaments. A review
must identify an exact payment-proof document. Its RegistrationPayment association
must reference an approved review of the same registration and a shared Payment.
Reviews, verified receipts and domain associations are immutable. Reviewed document
associations and their referenced StoredFile metadata are protected too. A review
cannot be redirected to different evidence by changing a storage key or other file
metadata. Tournament-owned persistence guards enforce this without adding domain
dependencies to shared file code. The current tournament schema permits one receipt
per registration/review and one refund association per receipt. Received and owed
amounts are finite, nonnegative BRL decimals.

Tournament refund associations require the shared Refund to refer to the same
shared Payment and owe its exact received amount, even when that differs from the
fee. The full-refund and 10-business-day rules stay in tournaments. Shared refunds
retain financial facts without imposing tournament policy on future consumers.
They contain no domain ID, fee/capacity rule or deadline calculation. The financial
source payment, amount and obligation time cannot be rewritten. No duplicate
amount, actor or progress columns live on the tournament associations.

An absent RegistrationRefund association means no recorded tournament obligation. `awaiting_refund` and
`completed` represent separate refund states. Pending refunds have no completion evidence. Completed refunds require both the actual time and
recording admin UUID. They do not reactivate cancelled participation or prevent
an otherwise valid replacement registration. These constraints also apply to
direct database writes.

The API supports proof submission, authorized retrieval, and exact-proof staff
approval/rejection. Approval atomically saves the review, shared receipt, association,
and confirmed or paid-waitlist outcome. Rejection returns to `awaiting_payment`
with a separate current-proof review and reason. Only a new proof can be reviewed
after rejection. Cancellation and refund commands remain unimplemented. Refund
workflows must calculate the deadline under PAY-012, record actual completion,
and send the required notifications. Persistence records and database guards do
not implement those workflows or authorize their actors.

## Initial journey

For a registration in `awaiting_payment`, the application shows the amount, configured instructions, and deadline when known. A valid proof is stored for manual review, including when the event is full. `awaiting_payment_confirmation` does not consume capacity. Staff approval with an available seat produces `confirmed` and assigns the seat; approval without a seat produces `waitlist` and an email notification.

Waitlisted participants have already had payment approved. Staff later selects and confirms a waitlisted participant under CAP-005 without requiring another payment approval. The system does not choose the participant or impose an invitation/payment stage. Submitted proof is evidence of payment to the guild, not funds held by an application wallet or gateway. Cancelled participation remains inactive while refund progress is tracked, so an outstanding refund does not block a replacement registration under the registration rules.

## Acceptance criteria

- **PAY-AC-001:** A participant sees the configured instructions and can upload an allowed proof for their authorized registration.
- **PAY-AC-002:** A rejected file creates no accepted proof, and the participant sees a useful error.
- **PAY-AC-003:** Uploading proof alone never produces a confirmed registration.
- **PAY-AC-004:** An unauthorized user cannot view, upload, or replace another participant's proof.
- **PAY-AC-005:** A payment-review decision is attributable to the authorized reviewer and time, and confirmation still respects capacity.
- **PAY-AC-006:** A configured payment deadline is shown. Passing it does not automatically reject a late Pix transfer or prevent staff from reviewing it and deciding whether to accept it or arrange a refund.
- **PAY-AC-007:** Staff approval of payment without an allocatable seat records a paid waitlist outcome and sends an email rather than confirming participation.
- **PAY-AC-008:** Cancellation does not claim that a refund has been completed. Recording the completed guild refund triggers a refund-confirmation email to the user.
- **PAY-AC-009:** Cancellation before payment creates no refund obligation; cancellation after payment shows `awaiting_refund`. Any occupied seat is released immediately, without waiting for the refund.
- **PAY-AC-010:** PDF, JPEG, and PNG files at or below 10 MB are accepted; disallowed types and larger files are rejected without an accepted upload.
- **PAY-AC-011:** After replacement, the participant can retrieve only the latest proof while authorized staff can review all submitted versions.
- **PAY-AC-012:** Rejecting evidence records and displays the reason, notifies the participant, and allows resubmission without assigning a seat.
- **PAY-AC-013:** A paid cancellation records a refund obligation equal to the amount received and a deadline 10 business days after cancellation.
- **PAY-AC-014:** Staff can accept a late payment subject to available capacity, or decline participation and initiate the paid cancellation/refund workflow. A capacity increase must be explicit; no late-payment decision silently overbooks the event.

## Open questions

None for the initial manual-payment flow. Late transfers are judged by staff under PAY-006 and PAY-013, not an automatic deadline policy.

Event fee and dates are [Tournament configuration](events/monomachia-2027.md#tournament-configuration). Retention is defined in [privacy rules](consent-and-privacy.md#rules). Bucket and SDK configuration belong in the [storage implementation decisions](../platform/data-storage.md#implementation-and-operations-decisions).

## Deferred questions

- **PAY-Q6:** Which provider and payment methods should the future gateway integration support?

Provider verification and duplicate-callback handling are engineering design topics once that future provider is chosen.

## Related specifications

[Registration](registration.md), [capacity](capacity-and-waitlist.md), [administration](administration.md), [privacy](consent-and-privacy.md), [communications](communications.md), [membership](../membership/overview.md).
