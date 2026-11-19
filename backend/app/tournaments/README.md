# Tournament module

**Created**: 2026-10-26
**Last updated**: 2026-11-18

This module manages tournament configuration, registration, participant documents,
payment review, and cancellation. It serves Monomachia and other tournaments
through the same models and routes. Guild staff can administer every tournament.
Supabase Auth owns account identity. Tournament records live in PostgreSQL `public`.

The [tournament specifications](../../../specs/README.md#capability-index) describe
the intended behavior. This README describes the current backend contracts and
ownership. [Karlmart](../karlmart/README.md) owns shared products, orders, payments,
and refunds.

## Catalog and access

`GET /api/tournaments` returns a paginated catalog with `items`, `total`, `limit`,
and `offset`. `GET /api/tournaments/{tournament_id}` returns one tournament.
Guests and regular users can see non-internal tournaments. Guild members and
admins can also see internal tournaments. An inaccessible tournament returns 404.
An invalid token returns 401, including on routes that allow guests.

The catalog accepts a case-insensitive `name` filter. `starts_from` and `starts_to`
filter the event start by inclusive calendar dates in UTC−03:00. A tournament slug
is unique. Staff may provide it or let the application derive it from the name,
discipline, and event year. Duplicate slugs return 409.

`starts_at` and `ends_at` are event timestamps. Registration uses inclusive
`registration_opens_on` and `registration_closes_on` dates in fixed UTC−03:00.
Staff may close registration independently with `is_registration_closed`.
A null `competitor_capacity` means unlimited capacity. `payment_due_at` is a
timestamp.

## Staff tournament configuration

Only admins can use `/api/staff/tournaments`. Guests receive 401 and signed-in
non-admins receive 403.

- `GET /api/staff/tournaments` lists all tournaments with pagination.
- `POST /api/staff/tournaments` creates a tournament.
- `GET /api/staff/tournaments/{tournament_id}` reads its configuration.
- `PUT /api/staff/tournaments/{tournament_id}` replaces the configuration using
  the create fields. The last staff save takes effect.
- `DELETE /api/staff/tournaments/{tournament_id}` deletes a tournament with no
  registrations. It returns 204 on success and 409 if a registration exists.

Staff projections include `pix_key`. Public catalog responses do not. A duplicate
slug or a capacity below confirmed participation returns 409. A failed database
transaction does not publish a partial configuration. Tournament change
notifications are not implemented. Future results must also prevent deletion.

## Registration

`POST /api/tournaments/{tournament_id}/registrations` registers the verified
account owner. The submitted email must match the current account email under
the existing normalization rule. Ownership uses the verified Supabase UUID.
The client cannot choose the owner, status, registration number, or staff safety
note.

Creation requires an open registration window. Missing window configuration,
staff closure, or dates outside the window return 400. Active duplicate owners,
normalized emails, or normalized identity documents within a tournament return
409. A cancelled registration permits a replacement.

The request includes participant details and separate declarations. Required
declarations must be JSON `true`. Image permission is independent and may be
`false`. Invalid or missing choices return 422. The server records the acceptance
time and source IP. The current acceptance contract is described below.

A new registration starts as `awaiting_payment`. Creating it or submitting a
proof does not consume a seat, even when capacity is full. Staff payment review
can later set `confirmed` or `waitlist`. Other states are
`awaiting_payment_confirmation` and `cancelled`.

The registration number has the format `T<tournament id>-<six-digit serial>-<Luhn digit>`.
It is a reference, not a credential. The tournament row lock protects allocation
of its serial number.

### Reading and editing registrations

`GET /api/tournaments/registrations` lists the signed-in account's registrations
across tournaments, including cancelled ones. Admins also receive only their own
registrations on this route.

`GET /api/tournaments/{tournament_id}/registrations` returns the caller's
registrations for that tournament. Admins receive all registrations with the
staff projection. `GET .../registrations/{registration_number}` permits the
owner or an admin. Other callers receive 404. Owner responses omit the staff safety
note and acceptance IP address.

Owners and admins can replace editable personal, sporting, and emergency-contact
details with `PUT .../registrations/{registration_number}`. A cancelled
registration is read-only for its owner. The update does not change ownership,
status, purchased options, or acceptance evidence. Duplicate email and identity
document checks still apply. Changing a birth date can make a parental consent
form necessary.

Identity uses `identity_document_type` and `identity_document_number`. Other
participant fields include `social_name`, `state_or_province`,
`school_or_team_name`, `instructor_name`, `hema_experience_description`,
`hema_started_year`, `previous_tournament_count`, `hema_ratings_reference`,
and `category_or_eligibility_note`. Experience may be free text or a start year.
A HEMA Ratings reference need not be a URL. Category notes are not staff approval.

### Declarations and current policy transition

Tournament reads return `acceptance_content` and `acceptance_tokens` for
`pt` and `en`. Each language's `policies.rules` and
`policies.cancellation_policy` has a `document` field. It contains
`version_id`, `original_file_name`, and the validated `content_type` when a version has been published.
An absent upload has a null `document` field.

The token covers declarations, equipment requirements, uploaded document
descriptors, and legacy policy text and URLs. Registration requires the
displayed language and token. Publication and registration creation share
the tournament lock. If the terms have changed, the API returns 409 and
the athlete must review the updated terms and confirm their choices again.

`RegistrationAcceptance` records the choices, verified user UUID, language,
server time, source IP, and references to the uploaded policy versions shown
on the form. Earlier records keep null references. Owner and staff registration
reads return `rules_version_id` and `cancellation_policy_version_id`.
Athletes can open recorded versions from the read-only declarations panel.

The registration form displays uploaded policies and requests an authorized
download when an athlete opens one. Legacy configuration remains in the backend
until the coordinated cutover. Final legal wording remains open under PRIV-Q1.

### Tags

Authenticated users can read definitions at
`GET /api/tournaments/{tournament_id}/tags`. Staff create, replace, and delete
definitions under `/api/staff/tournaments/{tournament_id}/tags`. A referenced
tag cannot be deleted.

Registration creation accepts `tag_ids`. Owners can read or replace their
selection at `.../registrations/{registration_number}/tags`. Owner changes
require an open registration window and are blocked by staff closure. Staff use
the equivalent `/api/staff/` routes and can update a selection after the window
closes. Duplicate IDs and tags belonging to another tournament are rejected.

`GET /api/staff/tournaments/{tournament_id}/registrations` gives staff a summary
of registrations, selected tags, and missing parental consent. It excludes
contact details, payment data, and safety notes.

## Documents and storage

The core files capability owns `StoredFile`, `ArchivedFile`, and storage
operations. Tournament services decide each file's purpose, validation, access,
and retention. There is no generic endpoint that grants access from a file ID.
Production uses private S3 storage. Local development uses Ministack. See
[decision 0008](../../../specs/decisions/0008-shared-files-and-archives.md) for
the ownership boundary.

### Tournament policy documents

`TournamentDocument` identifies a tournament document and its purpose.
`TournamentDocumentVersion` links one published version to an `ArchivedFile`.
The latest version is current. Publishing a replacement retains earlier versions
and their archived files. A tournament can have one `rules` document and one
`cancellation_policy` document. The model also permits documents without a
policy purpose, but this API does not yet publish or manage general resources.

Staff publish a policy version in three steps:

1. Call `POST /api/staff/tournaments/{tournament_id}/policy-documents/{purpose}/upload-url`.
   The purpose is `rules` or `cancellation_policy`.
2. Upload the file to the returned URL with the required headers.
3. Call `POST /api/staff/tournaments/{tournament_id}/policy-documents/{purpose}`
   with the returned `storage_key` and an `original_file_name`.

The staging key is bound to the staff account, tournament, and purpose. The
service checks the file's actual type and size before archiving it. It accepts
PDF, JPEG, and PNG files up to 10 MiB. An empty file or invalid staging key returns 422. An oversized file returns 413,
and an unsupported type returns 415. Storage failures
return 503. A failed publication preserves the prior current version.

`GET /api/tournaments/{tournament_id}/policy-documents` returns current policy
versions. `GET /api/tournaments/{tournament_id}/policy-documents/{purpose}/{document_id}/download-url`
returns a short-lived URL for the specified **version ID**. Both routes enforce
catalog visibility. A hidden tournament or an ID outside the requested tournament
and purpose returns 404.

The staff form saves tournament facts separately from policy publication.
Staff can enable refunds on a saved tournament with a published cancellation
policy. During the transition, staff updates that omit the legacy policy fields
preserve their stored values.

### Registration documents

`TournamentRegistrationDocument` associates a `StoredFile` with a registration.
Its types are `parental_consent_form` and `payment_proof`. A registration can
have one parental consent form and multiple retained payment proofs. Each
submission uses a separate stored file.

The upload policy in `services/registration_uploads.py` accepts PDF, JPEG, and
PNG up to 10 MiB. The service validates the permanent copy before attaching it.
Registration changes, file metadata, and the document association commit
together. On database failure, the service removes the newly promoted object.
Authorized download routes return short-lived URLs. They do not stream file bytes.

For a minor, the owner requests
`POST /api/tournaments/{tournament_id}/registrations/parental-consent-form/upload-url`,
uploads the file, and supplies the staging key and original filename when
creating the registration. Adults do not submit this form.

An owner whose existing registration needs a form can use the same upload URL,
then call `POST .../registrations/{registration_number}/parental-consent-form`
with its staging key and filename. The service checks ownership, age, and existing
evidence. Submission does not change registration status. The owner or an admin
can request a download URL with `GET .../registrations/{registration_number}/parental-consent-form`.
Other participants receive 404.

## Payment and proof review

A registration selects a `TournamentProduct`. Its order item records the selected
product and price. Tournament payment settings optionally store a `pix_key`.
A blank key creates no settings row. The public catalog does not expose the key.

The owner reads `GET .../registrations/{registration_number}/payment` for the
registration status, purchased price, deadline, optional Pix key, and latest
proof metadata. Other callers, including admins, receive 404. An absent key is
returned as null.

The owner requests `POST .../payment-proof/upload-url`, uploads using its
required headers, then submits `storage_key` and `original_file_name` to
`POST .../payment-proof`. The optional filename supplied when requesting the URL
also determines the extension retained in storage keys. A first valid proof sets
`awaiting_payment_confirmation`. Replacement is allowed while awaiting payment
or confirmation. Earlier proofs are retained, but the owner download route
`GET .../payment-proof` returns only the latest.

### Staff review

`GET /api/staff/tournaments/payment-reviews` lists pending reviews across
tournaments. It supports pagination and an exact `registration_number` filter.
The queue includes the latest undecided proof for registrations awaiting review,
including eligible cancelled registrations. It omits contact, identity, safety,
and storage fields.

`GET /api/staff/tournaments/payment-reviews/{registration_number}` returns the
staff registration projection, price, deadline, capacity, proof history,
parental form metadata, and review history. A staff member can request a
short-lived URL for a proof or parental form at
`GET .../payment-reviews/{registration_number}/documents/{document_id}/download-url`.
Mismatched documents return 404. Storage failures return 503. Staff routes
require admin access.

Staff submit a decision with
`POST /api/staff/tournaments/payment-reviews/{registration_number}/decisions`.
The request identifies the displayed `document_id`. Approval requires
`requirements_checked=true` and a nonnegative finite BRL `amount_received` with
at most two decimal places. Rejection requires a nonblank reason and no amount.
The amount received can differ from the purchased price. The server records the
actor and time.

Only the latest undecided proof is eligible. Stale or repeated decisions return
409. Approval of an active minor's registration also requires a parental form.
Payment deadlines and closed registration windows do not prevent review.

Approval records the review, payment, association, and participation outcome in
one transaction. An active registration becomes `confirmed` or `waitlist` based
on capacity. Rejection returns an active registration to `awaiting_payment`.
A new proof clears the current rejection projection while retaining its history.
A cancelled registration stays cancelled when its pending proof is reviewed.

The response includes the review, registration status, and notification result.
The service attempts applicable Portuguese notices after commit. A delivery failure
does not undo the decision. Templates live in
[`templates/email_notifications.py`](templates/email_notifications.py).
Supabase manages account email templates separately. See the
[Auth email runbook](../../../docs/runbooks/supabase-auth-email-ses.md).

## Cancellation and refunds

`POST .../registrations/{registration_number}/cancel` lets staff cancel a
registration. The owner can cancel when `refunds_allowed` is true. Repeated
cancellation or unavailable self-service returns 409. Cancellation releases an
occupied seat and preserves the order, proof, and payment evidence.

For an eligible tournament, a verified payment creates a refund obligation for
the full amount received. Its deadline is the tenth weekday after cancellation
in UTC−03:00, ignoring holidays. A receipt without the required approved proof
association must be reconciled before cancellation. A pending proof can still
be reviewed after cancellation. Approval records the payment without restoring
participation and creates a refund obligation when applicable.

The owner or staff can read `GET .../registrations/{registration_number}/refund`.
It returns null when no obligation exists. Staff list outstanding obligations at
`GET /api/staff/tournaments/refunds`, with pagination and an optional exact
registration number.

After transferring the full amount outside the application, staff record the
actual offset-aware `completed_at` with
`POST /api/staff/tournaments/{tournament_id}/registrations/{registration_number}/refund/complete`.
The service rejects a missing or completed obligation and a timestamp outside
the interval from cancellation to the current time. It records the actor and
attempts an email after commit. Turning refund eligibility off does not remove
existing obligations.

## Code and persistence boundaries

`routers/__init__.py` assembles the routes. `routers/anonymous.py` owns catalog
and policy-document reads available to guests. `routers/authenticated.py` owns
signed-in registration and participant-document routes. `routers/staff.py` owns
staff configuration, policy publication, and staff workflows. Each staff route
requires admin access. Services also enforce record-level rules.

Tournament services own registration, proof review, and their associations.
Karlmart owns shared payment and refund facts. Payment review and cancellation
lock the tournament and registration in the same order and commit related facts
in one transaction. See the [payment persistence contract](../../../specs/tournaments/payments-and-confirmation.md#persistence-contract),
[decision 0009](../../../specs/decisions/0009-shared-payments-and-domain-associations.md),
and [decision 0010](../../../specs/decisions/0010-database-functions-trigger-and-procedures.md).

Alembic manages the application schema. The initial revision replaced an earlier
development schema and has no upgrade path from it. See the
[migration notes](../../../docs/database-migrations.md) before applying or resetting
migrations. Supabase-managed `auth` objects are outside this history.
