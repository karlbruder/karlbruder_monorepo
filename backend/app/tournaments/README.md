# Tournament module

**Created**: 2026-10-26
**Last updated**: 2026-11-14

The application stores reusable `Tournament`, `TournamentRegistration`, and
`TournamentRegistrationDocument` records in PostgreSQL `public`. Monomachia is one event
using the same capability as later tournaments. Staff access applies globally.
Account sign-up remains a separate Supabase Auth operation.

## Pricing transition

Registration selects a product through `TournamentProduct` and records the
selected product and price on an order item. Payment review links the receipt to
the order.
See [Karlmart](../karlmart/README.md).

## Catalog and policies

`GET /api/tournaments` returns `items`, `total`, `limit`, and `offset`.
`GET /api/tournaments/{tournament_id}` returns one event. Guests and regular
users see non-internal events. Guild members and admins also see internal events.
An inaccessible event returns 404. A supplied invalid token returns 401 even
on a guest-readable route. Only admins may use the staff configuration endpoints.

`name` filters display names without case sensitivity. `starts_from` and
`starts_to` filter the event start by inclusive calendar dates in UTC-03:00.
The unique slug may be supplied or derived from name, `discipline`, and event year.
A duplicate slug returns 409.

Event timestamps are `starts_at` and `ends_at`. Registration windows use inclusive
`registration_opens_on` and `registration_closes_on` dates. `is_registration_closed`
is an independent staff closure flag. `competitor_capacity` may be null for unlimited
capacity. `payment_due_at` is a timestamp.

Policies have explicit `rules_text`, `rules_url`, `cancellation_policy_text`, and
`cancellation_policy_url` fields. Text and HTTP(S) URLs may be configured together
or separately. Missing content remains visibly unconfigured. Text is displayed as
text even when it resembles a URL. `rules_version` and `terms_version` identify
accepted versions. Approved legal wording remains unresolved under PRIV-Q1.

## Staff tournament configuration

`GET /api/staff/tournaments` lists all events with `items`, `total`, `limit`,
and `offset`. `GET /api/staff/tournaments/{tournament_id}` reads one event.
These staff projections include `pix_key`. Public catalog responses do not
expose it. `POST /api/staff/tournaments`
keeps its existing create contract.

`PUT /api/staff/tournaments/{tournament_id}` replaces the configuration. Send
the create fields. The last staff save replaces the configuration. A duplicate
slug or capacity below confirmed participation returns 409. Every save
captures configured policy links again. A failed capture, storage operation, or
database transaction publishes no partial change. `DELETE` on the same resource
returns 204 for an eligible event. It returns 409 when any registration exists.
Missing events return 404. Guests receive 401 and non-admins receive 403.

Notifications for event changes remain future work. Future results must also
prevent deletion.

## Consent for an existing registration

The registration owner can submit a missing parental consent form after an event
change makes them a minor. Registration responses include `parental_consent_required` when an active
registration needs the form. The owner
uses the existing parental consent upload URL and posts its staging key and original
file name to `POST /api/tournaments/{tournament_id}/registrations/{registration_number}/parental-consent-form`.
The service checks ownership, age, and existing evidence. It validates the uploaded
file before attaching it. A successful submission does not change registration status.

## Preserved policies and acceptance

Tournament creation captures each configured policy URL before saving the event.
Staff can save both formats. Registration displays the archived link when present and falls back to inline text.
Each URL capture creates a shared ArchivedFile referencing StoredFile metadata.
The capture retains source/final URLs, SHA-256 and capture time. Private stored
bytes use a fresh key. Reads do not fetch the source again. A new capture preserves
a new copy even when its source URL is unchanged. Both creation and replacement
capture configured URLs before publishing the configuration.

The bounded client accepts public HTTP(S) PDF, plain text and HTML documents.
It checks every redirect and resolved address, pins the connected IP, retains
HTTPS hostname verification, and sends no application credentials. Limits are
three redirects, 10 MiB and ten seconds per document. DNS waits are bounded with
at most four outstanding resolver calls per process. Compressed responses are
rejected. Two linked policies may add up to twenty seconds to a configuration
save. Captures run synchronously without a worker or queue.

Tournament reads include `acceptance_content` and `acceptance_tokens` keyed by
`pt` and `en`, plus `rules_archive_url` and `cancellation_policy_archive_url`.
Archive links follow the existing tournament visibility rules. They expire after
900 seconds and force an attachment download, including for HTML. Original source
URLs remain configuration metadata. The form reads the preserved copy and renders
inline content as text.

Registration creation requires `acceptance_language` and `acceptance_token`.
The digest binds the exact draft declaration labels, policy
text/archive references, equipment requirements and configured versions.
Changed content returns 409 with `Registration terms changed; refresh before accepting`.
The form refreshes the event, retains personal fields and clears declaration/image
choices. It never silently retries acceptance of changed content.

RegistrationAcceptance owns the eight individual choices, accepted versions,
verified user UUID, language, exact content, server time and source IP.
Registration, first acceptance and required parental document commit together.
Database triggers prevent updating or deleting acceptances and policy archives,
and prevent changing metadata of files referenced by policy archives. Later
snapshots append history. Owner/staff responses explicitly project the latest
snapshot and keep their existing privacy boundary. Acceptance history/editing
endpoints and approved legal wording are not provided. Failed saves roll back
metadata and clean only newly created objects. Historical archives are retained.

## Registration

`POST /api/tournaments/{tournament_id}/registrations` registers the verified
account owner. The JSON body supplies participant information and separate
boolean declarations. Required declarations must be JSON `true`. Image permission
is an independent choice and may be `false`. Missing or invalid choices return 422.
The submitted email must match the current account email under the existing
normalization rule. Ownership uses the verified Supabase UUID, not email.

Identity fields are `identity_document_type` and `identity_document_number`.
Other descriptive names include `state_or_province`, `school_or_team_name`,
`instructor_name`, `hema_experience_description`, `hema_started_year`,
`previous_tournament_count`, `hema_ratings_reference`, and
`category_or_eligibility_note`. HEMA experience remains free text and/or a start
year. A HEMA Ratings reference is not required to be a URL. `social_name` remains
available. Category notes do not constitute staff eligibility approval.

The declarations retain separate truthful-information, equipment, physical-fitness,
risk, data-processing, rules, and cancellation-policy choices. Field names include
`declares_has_required_equipment` and `accepts_rules`. The accepted rules preserve the coverage terms and results audience.
The backend records accepted versions, acceptance time, and `accepted_from_ip`.
Clients select a displayed language and content digest. The server supplies
versions, time, IP and ownership. Clients cannot choose the owner, `registration_status`,
`registration_number`, or `staff_safety_note`.

Creation requires configured terms/rules versions and an open registration window.
Missing configuration, staff closure, or dates outside that window return 400.
Active duplicate owners, normalized emails, or normalized identity documents within
a tournament return 409. Cancelled registrations permit replacement.

Every creation starts as `awaiting_payment`. Creation and proof submission consume
no seat, including when capacity is full or zero. Staff confirmation is a later
workflow. The existing states remain `awaiting_payment`, `awaiting_payment_confirmation`,
`confirmed`, `waitlist`, and `cancelled`.

`registration_number` retains `T<tournament id>-<six-digit serial>-<Luhn digit>`.
It is a reference, not a credential. `next_registration_number` is an integer
counter allocated under the tournament row lock. Concurrent creates cannot reuse
its value. It does not store a formatted reference string.

`GET /api/tournaments/{tournament_id}/registrations` returns only the caller's
registrations, including cancelled rows. Admins receive every registration with
the staff projection. `GET .../registrations/{registration_number}` permits the
owner or an admin. Other callers receive 404. Owner responses omit
`staff_safety_note` and `accepted_from_ip`. No public directory is introduced.

## Private documents

Minors first call
`POST /api/tournaments/{tournament_id}/registrations/parental-consent-form/upload-url`,
then upload through the returned presigned URL. Creation includes
`parental_consent_form_storage_key` and
`parental_consent_form_original_file_name`. The minor's registration and
accepted parental document metadata are saved together. Adults do not submit that form.

`TournamentRegistrationDocument` records `registration_id`, `file_id`,
`document_type`, and `submitted_at`. Document types are `parental_consent_form`
and `payment_proof`. Each submission references a separate `StoredFile` through
a restrictive foreign key. One registration may have one parental consent form
and multiple retained payment proofs. The same stored file cannot be attached
twice within tournament registrations.

`app/core/files/` owns file metadata and storage operations. Tournament services
own purpose, validation, access, retention, and version selection. Core files
does not import tournaments. See [decision 0008](../../../specs/decisions/0008-shared-files-and-archives.md)
for the boundary and future reuse examples.

The tournament upload policy lives in `services/registration_uploads.py`.
It accepts PDF, JPEG, or PNG up to 10 MB and validates the copied permanent bytes.
Registration, stored-file metadata and document association commit together.
A database failure rolls them back and removes the newly promoted object.

File metadata is retrieved through authorized tournament operations. There is
no generic file-access endpoint. Owner/staff permissions and latest-proof-only
owner reads stay in the tournament domain.
Storage remains private S3 in production and Ministack locally.

`GET .../registrations/{registration_number}/parental-consent-form`
returns a short-lived download URL to the owner or an admin. Other participants
receive 404. The API does not stream file bytes. Event-day accompaniment and
identity-document checks remain separate requirements.

## Payment settings and instructions

The tournaments domain owns optional `TournamentPaymentSettings`, with a unique
`tournament_id` and a directly stored `pix_key`. There is no shared-recipient
indirection. A blank key creates no settings row. The public catalog never exposes
Pix configuration. Admins may supply `pix_key` at tournament creation.

`RegistrationPaymentInstructions` is an assembled response, not a table.
`GET .../registrations/{registration_number}/payment` combines the registration
number/status, purchased price and payment deadline, optional `payment_options.pix.pix_key`,
and metadata for the latest proof. Only the owner may read these instructions.
Other callers, including admins, receive 404. An absent destination is returned
as null and shown as unconfigured. No key is invented or bundled in the frontend.

For payment proof, the owner calls `POST .../payment-proof/upload-url`, uploads
with the required headers, then calls `POST .../payment-proof` with `storage_key`
and `original_file_name`. The first valid submission sets `awaiting_payment_confirmation`.
Replacement is allowed while `awaiting_payment` or `awaiting_payment_confirmation`.
Every submitted proof is retained. The owner retrieves only the latest through
`GET .../payment-proof`. The staff decision endpoint is documented below.

A proof alone is evidence. Payment verifications now record verified receipts and
participation outcomes, with rejection and paid-waitlist notices. Refund actions
remain future work. The frontend entry
is `/tournaments/registration`.

## Financial evidence records

Tournaments owns the proof review and its link to the verified payment.
`PaymentProofPayment` requires an approved review of a proof from the same
registration order. Karlmart owns the [payment and refund facts](../karlmart/payments/README.md).
A tournament refund owes the full amount received and records its deadline on
`Refund`. An absent refund means there is no recorded obligation.

The staff payment-review workflow authorizes the actor and commits review, receipt,
association, and participation changes atomically. Cancellation records the
participation change and any refund obligation in the same transaction.
Shared persistence helpers use the caller's transaction. Payment review and
cancellation acquire the tournament and registration locks in the same order.

The [payment spec](../../../specs/tournaments/payments-and-confirmation.md#persistence-contract)
owns the persistence requirements. [Decision 0009](../../../specs/decisions/0009-shared-payments-and-domain-associations.md)
explains ownership. [Decision 0010](../../../specs/decisions/0010-database-evidence-guards.md)
explains database guards. They protect evidence invariants, not actor authorization,
staff workflows, or S3 bytes.

## Migration boundary

Revision `20261103_0001` creates the current schema directly. The product owner
authorized a clean baseline for this pre-data refactor. The previous revision
chain and the intermediate rename migration are removed. There is no old-schema
upgrade or old request-field/route alias. The development reset must include
`public.alembic_version`, with Supabase-managed `auth` objects left intact.
See [migration notes](../../../docs/database-migrations.md) for the reset and test boundaries.

## Staff payment-review evidence

Admins can read pending work across all tournaments with
`GET /api/staff/tournaments/payment-reviews`. The queue supports `limit` (1–100),
`offset`, and an optional exact `registration_number`. It includes only registrations
in `awaiting_payment_confirmation` whose latest proof has no decision. Results are ordered by
current proof ID. The queue excludes contact, identity, safety, and storage fields.

`GET /api/staff/tournaments/payment-reviews/{registration_number}` returns the staff
registration projection, purchased price, deadline, equipment requirements, capacity, confirmed
count, proof versions, parental form metadata, and review history. Decided records
remain readable. Reads do not allocate seats or record decisions.

`GET /api/staff/tournaments/payment-reviews/{registration_number}/documents/{document_id}/download-url`
issues a short-lived URL only for a proof or parental form belonging to that
registration. Metadata reads do not call storage. Unknown registrations and mismatched
documents return 404. Storage failures return 503. Guests receive 401 and authenticated
non-admins receive 403 on all three endpoints. Owner proof access remains latest-only.


## Payment review decisions

`routers/staff.py` owns the payment-review HTTP endpoints.
`services/payment_proof_reviews.py` owns evidence reads and recording staff
decisions. Its private helpers group lock acquisition, current-proof checks,
and payment approval. `services/payment_review_notifications.py` owns delivery
availability, message composition, and delivery-result logging.

`POST /api/staff/tournaments/payment-reviews/{registration_number}/decisions`
requires an admin and the displayed `document_id`. Use `decision=approved` with an
explicit nonnegative finite BRL `amount_received` (at most two decimal places,
Numeric(12,2) range) and `requirements_checked=true`. Received amount is independent
of the purchased price. Use `decision=rejected` with a nonblank `rejection_reason`
and no amount. Actors and timestamps are server-owned.

Only the latest undecided payment proof of a registration in `awaiting_payment_confirmation`
is eligible. Invalid/stale/repeated decisions return 409 without a new review,
receipt, or notice. Minor approval also requires a stored parental form. Passed
payment deadlines and closed registration windows do not prevent staff review.

The workflow locks Tournament then TournamentRegistration and reloads locked
values. Approval saves PaymentProofReview, shared Payment, PaymentProofPayment,
and `confirmed` or `waitlist` in one transaction. Only confirmed rows consume
capacity. Rejection writes a review, sets `awaiting_payment`, and creates no receipt.
Its current-proof reason appears in the owner payment response as `current_review`.
A new valid proof restores `awaiting_payment_confirmation` and clears that projection, while
retaining older evidence. Confirmed/waitlist owners cannot replace proofs.

The response contains `review`, `registration_status`, and `notification_result`.
Rejection and paid waitlist attempt one Portuguese notice to the registrant's
current account email after commit and lock release. Confirmed approval returns
`not_required`. Delivery failures return the saved outcome with a failure result.
Unavailable configuration returns `unavailable`. No automatic retry replays a notice.


## Router organization

`routers/__init__.py` assembles the tournament API without defining or adding
prefixes. Each endpoint router declares its full prefix.
`routers/anonymous.py` contains catalog endpoints that guests may call. Signed-in
users use the same endpoints with their existing visibility rules.
`routers/authenticated.py` contains registration and document endpoints requiring
sign-in, including the existing staff-aware registration reads.
`routers/staff.py` contains tournament creation and staff payment review under
`/api/staff/tournaments`. The anonymous and authenticated routers each use
`/api/tournaments`.
The authenticated router declares its access guard once. Its handlers receive
the verified caller through `AuthenticatedUser`. Staff endpoints keep their explicit
admin dependency. Tournament creation
is now `POST /api/staff/tournaments`. The former creation path and
`/api/tournaments/staff/...` payment-review paths are not registered. Catalog,
owner registration/document URLs, identifiers, and response contracts are preserved.


## Cancellation and manual refunds

`POST /api/tournaments/{tournament_id}/registrations/{registration_number}/cancel`
lets the owner or staff cancel participation. It returns 204 on success and 409
if the registration was already cancelled. Any occupied seat is released at commit.
A verified payment creates an obligation for the full amount received. Its deadline
is the tenth weekday after cancellation in fixed UTC−03:00, ignoring holidays.
Cancellation leaves the order, proof, and payment evidence intact.

`GET /api/tournaments/{tournament_id}/registrations/{registration_number}/refund`
returns the refund amount, status, deadline, and completion time to the owner
or staff under the tournament visibility rules. It returns JSON `null` when
there is no recorded obligation.

`GET /api/staff/tournaments/refunds` lists outstanding refunds across tournaments
in deadline order. It accepts `limit` (1–100), `offset`, and an optional exact
`registration_number`. Staff can follow the registration number to the payment
review record for evidence.

After transferring the full amount outside the application, staff submits the
actual timestamp as an offset-aware `completed_at` to
`POST /api/staff/tournaments/{tournament_id}/registrations/{registration_number}/refund/complete`.
It returns 409 for an already completed refund, a missing obligation, or a
transfer time outside the interval from cancellation through the current time.
The command records completion time and actor while participation stays cancelled.
It attempts email delivery after commit and reports the delivery result.
