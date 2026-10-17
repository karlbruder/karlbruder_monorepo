# Tournament communications

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Required workflow notifications and later messaging extensions |
| Applications | frontend, backend |
| Sources | Monomachia source requirements, sections 4 and 7; product-owner [registration answers](registration.md) |

## Goal

Keep participants informed about registration, payment, confirmation, and waitlist actions without requiring code changes to edit message copy.

## Required communication types

The source calls for form-received acknowledgment, payment instructions, pending-payment reminders, definitive confirmation, waitlist entry, waitlist call-up, documentation-pending notices, cancellation, and general organization messages. The owner's answers require email on paid waitlist entry, completed refund, rejected payment evidence, and material event-fact changes under CAT-008. Each notification is required when its triggering workflow is delivered; the broader reminder and announcement suite remains deferred.

The acceptance criteria for acknowledgments, definitive-confirmation emails, and editable templates apply when those later messaging capabilities are delivered. They do not expand PROD-011's first-release notification scope. Staff may contact waitlisted participants as part of their operational judgment; this does not introduce an automated invitation workflow.

## Rules

- **COM-001:** Messages must reflect persisted registration and payment outcomes. Receipt of a form or proof must not be described as a confirmed seat.
- **COM-002:** Guild staff (admins) can edit email copy without changing application source under their global admin access. Template variables and versioning require an agreed design.
- **COM-003:** Email does not contain attached payment proofs or sensitive registration/safety details. Links to private records require application authorization.
- **COM-004:** Email delivery failure must not silently change the underlying registration or payment decision. Participants can still consult their status in the application.
- **COM-005:** Waitlist contact follows staff judgment under CAP-005. Messages do not select a participant, reserve a seat, or impose a system-defined invitation expiry. Do not automate waitlist ordering or promotion. Automatic payment-reminder scheduling remains deferred under COM-Q3.
- **COM-006:** Send refund confirmation only after guild staff records the completed refund, not when the user first cancels. Cancellation without payment does not trigger refund confirmation. When staff approves payment but the tournament is full, email the user that they are waitlisted and have no confirmed seat.
- **COM-007:** The backend sends application emails through AWS SES using SMTP. SMTP credentials and connection settings are backend configuration. Local SMTP setup is deferred, likely real SES with real AWS/SES credentials. No local mail emulator is chosen by the S3/Ministack decision.
- **COM-008:** Send application email in Portuguese from `Suporte Karlbrüder <no-reply@karlbruder.com.br>`. Use the user's current account email at delivery time, not a stale registration email or stripped comparison value. Ownership remains the Supabase UUID after an email change.
- **COM-009:** Rejected payment evidence notifies the participant with the rejection message and a resubmission path. Tournament date, schedule, location, regulation, equipment-requirement, and cancellation-policy changes notify affected registrants under CAT-008. Ordinary staff corrections to registration fields do not require notifications; required workflow notices still apply.

## Acceptance criteria

- **COM-AC-001:** A form-received message includes an appropriate registration reference and does not claim a confirmed seat.
- **COM-AC-002:** Definitive confirmation is sent only for a persisted confirmed registration.
- **COM-AC-003:** An authorized template edit changes subsequent message copy without a code deployment.
- **COM-AC-004:** A notification delivery failure leaves registration status accurate and visible in the application.
- **COM-AC-005:** No template output attaches proof files or exposes private safety information.
- **COM-AC-006:** Recording a completed refund leads to refund confirmation by email; cancellation alone does not send a message claiming the refund is complete.
- **COM-AC-007:** Staff approval of payment when no seat is available records waitlist status and sends the user an email explaining that outcome.
- **COM-AC-008:** Production notification delivery uses the configured AWS SES SMTP connection and exposes no SMTP credentials to browser code.
- **COM-AC-009:** After an account email change, subsequent registration messages use the current account email, in Portuguese, with the configured sender identity.
- **COM-AC-010:** Rejecting payment evidence sends its reason and resubmission guidance; changing a CAT-008 notification-triggering fact informs affected registrants.

## Open questions

None for sender, language, recipient selection, required triggers, or waitlist handling. Message wording is staff-maintained template content under COM-002. Waitlist selection and any contact before confirmation are [staff decisions](capacity-and-waitlist.md#rules), without a system-enforced invitation-expiry policy.

## Deferred questions

- **COM-Q3:** For the later messaging suite, what payment-reminder schedule and general-announcement workflow should guild staff use?

## Implementation decisions

Select SES region/SMTP settings and implement delivery-attempt tracking, failure handling, retries, and duplicate-send control in the delivery plan. These are engineering choices, not additional product questions. Local SMTP configuration remains explicitly deferred, likely real SES with real credentials; do not re-ask it during unrelated feature work.

## Related specifications

[Registration](registration.md), [payments](payments-and-confirmation.md), [capacity](capacity-and-waitlist.md), [administration](administration.md), [privacy](consent-and-privacy.md).
