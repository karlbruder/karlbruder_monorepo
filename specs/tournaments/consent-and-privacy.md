# Tournament consent and privacy

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Every released tournament workflow handling participant data; detailed policies unresolved |
| Applications | frontend, backend, landing where public information is displayed |
| Sources | Monomachia source requirements, sections 2, 3, 9, 10, and 11; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20) |

## Goal

Collect the necessary participant declarations, preserve their evidence, and restrict personal and sensitive information to its intended use.

## Rules

- **PRIV-001:** Present separate choices for regulation acceptance, required data processing, and image-use authorization. Image authorization is recorded separately as consent or refusal. A single blanket checkbox must not replace the individual choices.
- **PRIV-002:** Required event declarations cover truthful information, inherent HEMA risks, mandatory equipment, physical fitness, and awareness of cancellation/refund/disqualification rules. Truthful information is a separate required choice, recorded independently from the other declarations. Emergency contact and participation declarations are required by the registration answers. Final wording is still needed; image authorization remains a separate choice rather than a bundled required consent.
- **PRIV-003:** Record the accepted regulation/terms version, acceptance time, choices, and the IP evidence requested by the source. The handling and retention of that evidence must be defined in the privacy policy.
- **PRIV-004:** Private fields include document number, date of birth, email, phone, emergency contacts, payment proofs, staff notes, and safety information. Public representations must use explicit permitted fields rather than exposing complete registration records.
- **PRIV-005:** Participants may retrieve and correct their own TournamentSignup fields except `safety_note`, `id`, `tournament_id`, `user_id`, `inscription_number`, `created_at`, `updated_at`, and `status`. Safety notes are staff-only and excluded from participant responses, public views, and routine exports. Participant edits still obey validation and uniqueness rules; changing declarations must preserve earlier acceptance evidence.
- **PRIV-006:** Remove `show_on_public_list` and its opt-out choice. A limited participant directory and published results are visible to other authorized platform users under the event's public/internal access boundary. Terms must explain that participation and results are visible. Directory fields remain limited to display name, school/team, city/country, and confirmation status; private registration records are not exposed. This does not make private contact, payment, or safety fields public or change internal-event restrictions. Existing permitted guest access to published non-internal results remains unchanged.
- **PRIV-007:** Proof files require validated type/size, restricted storage, and authorized retrieval. Sensitive records and proofs are not email attachments or files in public website directories.
- **PRIV-008:** Released data-handling flows require HTTPS, appropriate protection against automated submissions, controlled administrative access, auditability, backups, and defined correction/deletion and retention processes.
- **PRIV-009:** Collect only data required for the event's agreed purpose. Administratively editable forms and terms must preserve the meaning and version of earlier acceptances.
- **PRIV-010:** Minors register themselves. Participation requires a parent's signed responsibility term, scanned and uploaded through the platform, and parental accompaniment during the event. At the event, both the minor and parent present their identity documents for staff to verify both in person. Store the scanned term privately with authorized staff access. Verification evidence follows the existing actor/time audit requirements; its representation is an implementation choice, not another product-policy question. This in-person check does not require additional identity-document uploads or copies.
- **PRIV-011:** The interim retention policy is indefinite for registrations, every submitted payment proof, safety information, acceptance/IP evidence, and audit records. Do not add automatic expiry or deletion under an invented period. A final retention schedule remains deferred for policy review; correction/deletion requests remain subject to PRIV-Q4.

## Delivery boundary

Issue #21 deferred the full consent package to a later issue. That is a delivery split, not a decision to omit consent or privacy from released registration. PROD-011 defines the first-release scope, and its required declarations and data protections still apply. Final consent/privacy text is owned here; regulation text or URL is Tournament configuration with versioned acceptance evidence. This draft records the owner's interim indefinite-retention choice, not final legal wording.

## Acceptance criteria

- **PRIV-AC-001:** Required missing acceptances, including the separate truthful-information declaration, prevent completion, while an image-use choice is recorded independently from other acceptances under the agreed policy.
- **PRIV-AC-002:** A completed registration can be associated with the exact accepted terms version and acceptance evidence.
- **PRIV-AC-003:** Public APIs, participant lists, event pages, and routine exports exclude restricted fields.
- **PRIV-AC-004:** Registration offers no participant-directory opt-out. Authorized platform users see the permitted directory projection, while restricted fields and internal-event boundaries remain protected.
- **PRIV-AC-005:** Unauthorized users cannot retrieve a proof or safety note through an identifier or storage link.
- **PRIV-AC-006:** A minor lacking either the signed parental responsibility term or parental accompaniment is not permitted to participate, under the agreed evidence-verification process.
- **PRIV-AC-007:** A participant can retrieve and correct their permitted signup fields but cannot retrieve `safety_note` or modify staff/system-managed fields. Invalid edits cannot bypass uniqueness or overwrite earlier acceptance evidence.
- **PRIV-AC-008:** A minor can upload the scanned parental term privately through the platform; unauthorized users cannot retrieve it.
- **PRIV-AC-009:** No automatic retention job expires covered records or earlier proof submissions under the interim indefinite policy.
- **PRIV-AC-010:** At event check-in, staff verifies the minor's and accompanying parent's presented identity documents. Uploading the signed term alone does not replace the in-person check or accompaniment requirement.

## Open questions

- **PRIV-Q1:** Do you already have the actual texts or documents participants must read and accept? We still need the wording for the separate truthful-information declaration, the risk/equipment/fitness declarations, the explanation of how registration data is used and visible to other platform users, and the separate permission or refusal to use their image. The types of declarations and separate choices are already decided; this asks for the approved content to display, or who will provide it before release. The event's own regulation remains Tournament configuration.
- **PRIV-Q4:** If a participant asks staff to delete their registration data or payment proofs, how should they submit that request, and what should staff delete versus keep? For example, should a completed event's signup be deleted, anonymized, or retained with its payment/audit history? Participants already may edit their allowed fields themselves; this asks how staff handles requests beyond that access. The interim default remains indefinite retention until this exception process is decided.


## Related specifications

[Registration](registration.md), [payments](payments-and-confirmation.md), [administration](administration.md), [results](results.md), [communications](communications.md), [deployment](../platform/deployment.md).
