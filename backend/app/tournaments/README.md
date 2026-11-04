# Tournament module

**Created**: 2026-10-26
**Last updated**: 2026-11-04

The application stores reusable `Tournament`, `TournamentRegistration`, and
`TournamentRegistrationDocument` records in PostgreSQL `public`. Monomachia is one event
using the same capability as later tournaments. Staff access applies globally.
Account sign-up remains a separate Supabase Auth operation.

## Catalog and policies

`GET /api/tournaments` returns `items`, `total`, `limit`, and `offset`.
`GET /api/tournaments/{tournament_id}` returns one event. Guests and regular
users see non-internal events. Guild members and admins also see internal events.
An inaccessible event returns 404. A supplied invalid token returns 401 even
on a guest-readable route. Only admins may `POST /api/tournaments`.

`name` filters display names without case sensitivity. `starts_from` and
`starts_to` filter the event start by inclusive calendar dates in UTC-03:00.
The unique slug may be supplied or derived from name, `discipline`, and event year.
A duplicate slug returns 409.

Event timestamps are `starts_at` and `ends_at`. Registration windows use inclusive
`registration_opens_on` and `registration_closes_on` dates. `is_registration_closed`
is an independent staff closure flag. `competitor_capacity` may be null for unlimited
capacity. `registration_fee_amount` is in BRL. `payment_due_at` is a timestamp.

Policies have explicit `rules_text`, `rules_url`, `cancellation_policy_text`, and
`cancellation_policy_url` fields. Text and HTTP(S) URLs may be configured together
or separately. Missing content remains visibly unconfigured. Text is displayed as
text even when it resembles a URL. `rules_version` and `terms_version` identify
accepted versions. Approved legal wording remains unresolved under PRIV-Q1.

## Preserved policies and acceptance

Saving tournament configuration captures each configured policy URL before
publishing the event. Inline text remains separate and both forms may be present.
Each URL capture creates a shared ArchivedDocument referencing StoredFile metadata.
The capture retains source/final URLs, SHA-256 and capture time. Private stored
bytes use a fresh key. Reads do not fetch the source again. Saving a new policy
configuration captures a new copy even when its source URL is unchanged.
There is no tournament-editing endpoint in this checkpoint.

The bounded client accepts public HTTP(S) PDF, plain text and HTML documents.
It checks every redirect and resolved address, pins the connected IP, retains
HTTPS hostname verification, and sends no application credentials. Limits are
three redirects, 10 MiB and ten seconds per document. DNS waits are bounded with
at most four outstanding resolver calls per process. Compressed responses are
rejected. Two linked policies may add up to twenty seconds to a configuration
save. This uses no deployed worker, queue or new dependency.

Tournament reads include `acceptance_content` and `acceptance_tokens` keyed by
`pt` and `en`, plus `rules_archive_url` and `cancellation_policy_archive_url`.
Archive links follow the existing tournament visibility rules. They expire after
900 seconds and force an attachment download, including for HTML. Original source
URLs remain configuration metadata. The form reads the preserved copy and renders
inline content as text.

Registration creation requires `acceptance_language` and `acceptance_token`.
The digest binds the exact draft declaration labels, both image choices, policy
text/archive references, equipment requirements and configured versions.
Changed content returns 409 with `Registration terms changed; refresh before accepting`.
The form refreshes the event, retains personal fields and clears declaration/image
choices. It never silently retries acceptance of changed content.

RegistrationAcceptance owns the eight individual choices, accepted versions,
verified user UUID, language, exact content, digest, server time and source IP.
Registration, first acceptance and required parental document commit together.
Database triggers prevent updating or deleting acceptances and policy archives,
and prevent changing metadata of files referenced by policy archives. Later
snapshots append history. Owner/staff responses explicitly project the latest
snapshot and keep their existing privacy boundary. No history/editing endpoint or
approved legal wording is introduced. Failed saves roll back metadata and clean
only newly created objects. Historical archives are retained.

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
risk, data-processing, rules, and cancellation-policy choices. The renamed choices
are `declares_has_required_equipment`, `accepts_rules`, and `authorizes_image_use`.
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
workflow. The existing states remain `awaiting_payment`, `payment_in_review`,
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

`StoredFile` lives in `app/core/files/models.py`. It records `storage_key`,
`original_file_name`, `content_type`, `size_bytes`, and `created_at`. Core stores
file metadata without a tournament reference, document-purpose enum, access
policy, or tournament upload-size limit. Shared S3 operations live beside it in
`app/core/files/storage.py`. Neither shared module imports tournament code.

The tournament upload policy lives in `services/registration_uploads.py`.
It accepts PDF, JPEG, or PNG up to 10 MB and validates the copied permanent bytes.
Registration, stored-file metadata and document association commit together.
A database failure rolls them back and removes the newly promoted object.
Creation and proof submission still consume no seat.

File metadata is retrieved through authorized tournament operations. There is
no generic file-access endpoint. Owner/staff permissions and latest-proof-only
owner reads stay in the tournament domain. Existing response fields remain
unchanged even though metadata now comes from the referenced StoredFile.
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
number/status, tournament fee/deadline, optional `payment_options.pix.pix_key`,
and metadata for the latest proof. Only the owner may read these instructions.
Other callers, including admins, receive 404. An absent destination is returned
as null and shown as unconfigured. No key is invented or bundled in the frontend.

For payment proof, the owner calls `POST .../payment-proof/upload-url`, uploads
with the required headers, then calls `POST .../payment-proof` with `storage_key`
and `original_file_name`. The first valid submission sets `payment_in_review`.
Replacement is allowed while `awaiting_payment` or `payment_in_review`.
Every submitted proof is retained. The owner retrieves only the latest through
`GET .../payment-proof`. Staff review of the history remains #60.

A proof is evidence, not a verified receipt or a transfer. Tournaments owns
PaymentProofReview and the RegistrationPayment / RegistrationRefund associations. These persistence
records do not change registration status or capacity by themselves.
Payment decisions, refund actions and notifications remain later workflows. The frontend entry remains `/tournaments/registration`.

## Financial evidence records

PaymentProofReview references one exact TournamentRegistrationDocument through
`document_id`. Only a `payment_proof` document is reviewable. It records
`decision` (`approved` or `rejected`), `reviewed_by_user_id`, `reviewed_at` and
`rejection_reason`. A rejected decision requires a nonblank reason. Each decision
is retained rather than overwritten. Recording a decision creates no receipt.

RegistrationPayment stores `registration_id`, the approved `proof_review_id`
and unique `payment_id`. It links one registration/review to a shared Payment.
Payment lives in the payments domain and stores actual BRL `amount_received`,
`verified_by_user_id` and `verified_at`. Those facts are not duplicated on the
association. The amount is independent of the advertised fee. Tournament guards
reject a rejected review or a proof from another registration. The current
tournament schema permits one verified receipt per registration/review.

RegistrationRefund stores `registration_payment_id`, unique `refund_id` and
`due_on`. The linked shared Refund stores `payment_id`, `amount_owed`,
`obligated_at`, `refund_status`, `completed_at` and `completed_by_user_id`.
Tournament guards require the refund to reference that registration's exact
shared payment and equal its received amount. The one-obligation/full-refund rule
and deadline belong to tournaments. Shared refunds do not impose those rules on
other consumers. No monetary or progress columns are duplicated on the association.

No association means no recorded tournament refund obligation. A linked Refund
in `awaiting_refund` has no completion evidence. `completed` requires both actual
time and recording UUID. Completion cannot precede the obligation. Source-payment,
amount and obligation time are immutable while completion can be recorded later.
Review, receipt and association history is retained. These records do not transfer
money, reserve a seat or reactivate cancelled participation.

Issue #60 must verify the admin, reviewability and concurrent command state.
Its approval transaction must write the review and receipt together with the
confirmed or paid-waitlist outcome. Later cancellation/refund work calculates the
10-business-day deadline, records the exact amount owed and actual completion,
and sends the required notifications. Generic persistence helpers use the caller’s transaction. No staff decision
or refund command/endpoint is added in this checkpoint. Fixture rows in tests verify persistence.

## Migration boundary

Revision `20261103_0001` creates the current schema directly. The product owner
authorized a clean baseline for this pre-data refactor. The previous revision
chain and the intermediate rename migration are removed. There is no old-schema
upgrade or old request-field/route alias. The development reset must include
`public.alembic_version`, with Supabase-managed `auth` objects left intact.
See [migration notes](../../docs/migrations.md) for the reset and test boundaries.
