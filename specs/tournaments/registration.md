# Tournament registration

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial tournament platform |
| Applications | frontend, backend |
| Sources | Product-owner overview and registration answers; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20), [#21](https://github.com/karlbruder/karlbruder_monorepo/issues/21); Monomachia source requirements, sections 2, 4, and 11 |

## Goal

Allow an authenticated user to register for a tournament, retain an inscription number, and follow their registration through review and confirmation.

## Rules

- **REG-001:** Users register only themselves through the frontend route `/tournaments/registration`, which submits a POST request to the backend tournament sign-up resource. The backend derives ownership from verified identity rather than trusting a caller-supplied owner identifier. Public/internal tournament access follows the [product rules](../product.md).
- **REG-002:** The backend validates required fields, required declarations including a separate truthful-information choice, the registration window, duplicate rules, and the applicable capacity policy.
- **REG-003:** Each accepted registration receives a unique, human-friendly `inscription_number` for participant/staff reference, not an access credential. The developer may choose its exact format and sequence semantics. A tournament slug, year, and sequential number, such as `MONO2027001`, is an acceptable example rather than a mandatory format.
- **REG-004:** Within a tournament, a non-cancelled registration blocks another registration for the same user UUID, normalized email, or normalized identity document. Duplicates return HTTP 409, including concurrent submissions. Cancelled registrations do not block a new registration, including while their refund is awaiting processing. Participation cancellation and refund progress must remain distinguishable so a refund does not reactivate a registration.
- **REG-005:** Registration is available from the configured opening day through the configured closing day, inclusive, in fixed GMT-3 (UTC-03:00). The window is expressed as calendar days, not configurable times within those days. Creation outside the date range returns HTTP 400, following issue #20.
- **REG-006:** Creation produces `awaiting_payment`. Proof submission stores the file for manual guild-staff review; it does not approve payment or reserve a seat. Neither `awaiting_payment` nor `payment_in_review` consumes capacity. When staff approves payment, the registration becomes `confirmed` and occupies a seat if one is available, or becomes `waitlist` and the user is notified by email if the tournament is full. A waitlisted registration has no seat. Staff may later select and confirm an already-paid waitlisted participant under CAP-005, without approving payment again; this also assigns capacity transactionally.
- **REG-007:** Successful submission shows the inscription number, registration summary, current status, and applicable next step. A waitlisted participant has already had payment approved but has no confirmed seat. Status messages must reflect that distinction.
- **REG-008:** Participants can retrieve and correct their own registrations under PRIV-005 and follow their status. Listing complete private registration records across users requires the admin role. Other authorized platform users may see only the limited participant-directory projection under PRIV-006, without an opt-out choice. An inscription number is not authorization to retrieve a private record.
- **REG-009:** Safety notes are staff-only. Participants may retrieve and correct other permitted signup fields, excluding staff/system-managed fields listed in PRIV-005. Public and participant-facing projections omit `safety_note`; edits preserve validation, uniqueness, ownership, and acceptance evidence.
- **REG-010:** The form works on phones and desktops, with readable labels and validation errors. Saving and resuming an incomplete form is a possible extension, not an established initial requirement.
- **REG-011:** Users sign up to the application before registering for a tournament. Registration ownership uses their existing Supabase `auth.users.id` UUID, obtained from the verified token subject. No separate user identity is created for tournament registration. On creation, the registration email must match the authenticated account email using REG-012. Changing the account email does not invalidate or transfer an existing registration.
- **REG-012:** Normalize email and identity-document values for comparison and uniqueness by lowercasing and removing whitespace, dots (`.`), and dashes (`-`). Retain the original registration email for display and history; the stripped comparison value is not a deliverable email address. Notifications use the current account email under COM-008. The same normalization is applied to the account email for the creation-time match.
- **REG-013:** Cancellation ends participation and immediately releases any occupied seat. Cancellation before payment produces `cancelled` without a refund obligation. Cancellation after payment also shows `awaiting_refund` until guild staff completes the refund. Once staff records the completed refund, the user receives a refund-confirmation email. Cancellation itself does not transfer money or claim a completed refund.
- **REG-014:** Repeated submissions use the ordinary create rules. If no blocking non-cancelled registration exists, the request attempts creation. Otherwise the duplicate rule applies. No special retry or replay-success behavior is required, including when the client lost the first response.
- **REG-015:** A minor registers themselves and uploads a scanned signed parental responsibility term through the platform. Participation also requires parental accompaniment during the event, where both the minor and parent present identity documents for staff verification under the [consent and privacy rules](consent-and-privacy.md#rules).
- **REG-016:** Cancelled registrations can be reopened only by admins manually through the Supabase UI. The application does not offer participant or admin reopening controls. A manual reopening must preserve non-cancelled uniqueness and any applicable seat limit; it must not coexist with a conflicting replacement registration.
- **REG-017:** Staff may close new registrations independently of the date window. Full capacity alone does not close registrations; warn applicants about the paid waitlist while creation remains open. Unconfigured capacity means unlimited, and the paid waitlist has no size limit.

## Registration information

The product owner's answers establish the required personal and sporting fields below. Issue #20 remains the starting data shape. Requirements for declarations and safety information are governed by the linked privacy/event specifications.

| Group | Information | Requiredness |
| --- | --- | --- |
| Personal | Full name, email, document type (`cpf` or `passport`) and number, phone, city, country, birth date | Required |
| Sporting | HEMA practice duration and/or start year, prior tournament count | Required; provide duration, start year, or both |
| Optional affiliation and location | School/team, responsible instructor, state/province | Optional; may be left blank |
| Additional athlete information | Social name, HEMA Ratings reference, handedness, category/special-case information | Optional |
| Safety | Emergency contact name and phone, equipment declaration, physical-fitness declaration | Required |
| Restricted safety information | Safety note relevant to participation | Optional; collected only when needed and restricted to authorized staff |
| Choices and evidence | Separate truthful-information declaration and other versioned declarations/consents, including disclosure of participant-directory and results visibility | Follow the consent/privacy requirements; no `show_on_public_list` choice |
| System | Tournament reference, Supabase user UUID, inscription number, registration status, refund progress when applicable, creation timestamp | System-managed; ownership is not chosen by the caller |

Store previous tournament participation as the required `prior_tournaments_count`, with `0` representing no prior tournaments. Avoid a second competing field for the same count. Beginner eligibility is confirmed by guild staff using the agreed event criteria, not just an athlete's self-selection.

## Lifecycle boundary

| State or outcome | Meaning | Capacity |
| --- | --- | --- |
| `awaiting_payment` | Registration created; no payment approved | No seat reserved |
| `payment_in_review` | Proof stored for manual payment review | No seat reserved |
| `confirmed` | Payment and participation validated | Occupies a seat |
| `waitlist` | Payment approved; waiting for staff selection and confirmation when a seat is available | No confirmed seat; newly available capacity does not promote the registration automatically |
| `cancelled`, no payment | Participation cancelled before payment | Any occupied seat released immediately; no refund due |
| Cancelled participation with `awaiting_refund` displayed | Participation cancelled after payment; guild refund not yet completed | Seat released immediately; refund progress does not block a replacement registration |
| Refund completed | Guild records refund and sends confirmation email | Participation remains cancelled; no occupied seat |

This table distinguishes registration participation from refund progress without prescribing the table/column layout. `awaiting_refund` is the required displayed refund status. The developer can choose how to store it alongside cancelled participation and completed-refund evidence. Other extended outcomes follow the relevant payment specification.

The latest answers supersede both issue #20's creation-time waitlisting and the earlier draft rule that review reserved capacity. Seats are assigned only by staff confirmation, during payment approval or later selection from the paid waitlist. Staff chooses whom to select; the system enforces capacity, not a queue priority or automatic call-up policy. See [payments](payments-and-confirmation.md), [capacity](capacity-and-waitlist.md), and [administration](administration.md).

## Acceptance criteria

- **REG-AC-001:** An authenticated user submitting valid data during an open window, while staff has not closed new registrations, receives a registration, unique inscription number, and `awaiting_payment` status without reserving a seat, including when the tournament is full.
- **REG-AC-002:** Missing or invalid authentication rejects creation with 401 and creates no registration.
- **REG-AC-003:** An existing non-cancelled registration with the same user UUID, normalized email, or normalized document within the tournament causes HTTP 409, including concurrent attempts. A cancelled record alone does not block a new registration.
- **REG-AC-004:** A request outside the configured registration window returns 400 and creates no registration.
- **REG-AC-005:** A non-admin participant can retrieve their own registration but cannot retrieve another user's record by inscription number alone. Guild staff retain their global admin access.
- **REG-AC-006:** Public responses omit safety notes, identity document numbers, payment proofs, and private contact details.
- **REG-AC-007:** Missing required personal/sporting information, emergency contact information, or required declarations, including the separate truthful-information choice, rejects submission. HEMA experience accepts duration, start year, or both. Blank school/team, instructor, state/province, handedness, and category/special-case fields are accepted.
- **REG-AC-008:** A registration email that does not match the normalized account email rejects creation. Changing the account email afterward does not change registration ownership or invalidate the registration.
- **REG-AC-009:** Email/document values differing only in case, whitespace, dots, or dashes are treated as the same value for the relevant comparison and uniqueness checks.
- **REG-AC-010:** A repeated create request while the first successful registration remains non-cancelled returns the ordinary duplicate error rather than creating a second record, even if the client lost the original response.
- **REG-AC-011:** Storing a valid proof and entering `payment_in_review` do not change occupied capacity, even when the event is full. Staff approval confirms and occupies a seat if available; otherwise it produces `waitlist` and an email notification.
- **REG-AC-012:** Cancellation does not report a completed refund. Once staff records the completed refund, the user receives refund confirmation by email.
- **REG-AC-013:** Cancellation before payment produces `cancelled` without `awaiting_refund`. Cancellation after payment shows `awaiting_refund`. In either case, any occupied seat is released immediately.
- **REG-AC-014:** A valid request after a previous cancellation can create a new registration; the old record remains cancelled and its refund can be tracked separately. Reopening the old registration is an admin-only manual Supabase operation, not an application feature.
- **REG-AC-015:** Requests on the opening and closing calendar days are within the window in GMT-3; requests before the opening day or after the closing day are rejected.
- **REG-AC-016:** The registration owner UUID is the already authenticated Supabase user's ID; changing an account email does not require a new owner mapping or user identity.
- **REG-AC-017:** A participant can correct their permitted signup fields but cannot edit ownership, identifiers, timestamps, or staff-controlled status, or retrieve staff-only safety notes. Edits cannot bypass duplicate constraints.
- **REG-AC-018:** A staff-selected paid waitlisted registration can become `confirmed` without a second payment approval, subject to eligibility and available capacity. An available seat alone does not change its status.


## Implementation baseline

No tournament routes, models, or migration tree were found in this checkout during source inspection on 17 October 2026. Issue #20 is intended work. Issue #21's public form placement is superseded by [decision 0001](../decisions/0001-public-website-and-application.md).

## Implementation decisions

No remaining registration-policy questions from this round. The exact inscription-number format, backend POST path, selected-tournament handoff, and persistence details are implementation design choices within the rules above.

Event dates, fees, and category criteria belong in the [event specification](events/monomachia-2027.md). Refund amounts/deadlines and proof-storage settings belong in [payments](payments-and-confirmation.md). Email recipient/delivery details belong in [communications](communications.md). The parental-signature process belongs in [consent and privacy](consent-and-privacy.md).

## Related specifications

[Identity](../identity/authentication-and-access.md), [catalog](catalog.md), [payments](payments-and-confirmation.md), [capacity](capacity-and-waitlist.md), [consent and privacy](consent-and-privacy.md).
