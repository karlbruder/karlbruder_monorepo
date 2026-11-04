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

Tournament creation captures each configured policy URL before saving the event.
Inline text remains separate and both forms may be present.
Each URL capture creates a shared ArchivedFile referencing StoredFile metadata.
The capture retains source/final URLs, SHA-256 and capture time. Private stored
bytes use a fresh key. Reads do not fetch the source again. A new capture preserves
a new copy even when its source URL is unchanged. Tournament editing is not
implemented.

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
`declares_has_required_equipment`, `accepts_rules`, and `authorizes_image_use`.
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
number/status, tournament fee/deadline, optional `payment_options.pix.pix_key`,
and metadata for the latest proof. Only the owner may read these instructions.
Other callers, including admins, receive 404. An absent destination is returned
as null and shown as unconfigured. No key is invented or bundled in the frontend.

For payment proof, the owner calls `POST .../payment-proof/upload-url`, uploads
with the required headers, then calls `POST .../payment-proof` with `storage_key`
and `original_file_name`. The first valid submission sets `payment_in_review`.
Replacement is allowed while `awaiting_payment` or `payment_in_review`.
Every submitted proof is retained. The owner retrieves only the latest through
`GET .../payment-proof`. Staff review commands are not implemented.

A proof is evidence, not a verified receipt or a transfer. Payment decisions,
refund actions, and notifications remain future workflows. The frontend entry
is `/tournaments/registration`.

## Financial evidence records

Tournaments owns these records:

| Record | Fields and constraints |
| --- | --- |
| PaymentProofReview | `document_id`, `decision`, `reviewed_by_user_id`, `reviewed_at`, `rejection_reason`. Review only an exact `payment_proof`. Decisions are `approved` or `rejected`, with a nonblank reason for rejection |
| RegistrationPayment | `registration_id`, approved `proof_review_id`, unique `payment_id`. The proof must belong to that registration. One receipt per registration/review |
| RegistrationRefund | `registration_payment_id`, unique `refund_id`, `due_on`. The shared refund must reference that exact payment and owe its full received amount |

Payments owns the linked [Payment and Refund facts](../payments/README.md),
without duplicate amounts, actors, or progress on tournament associations. The
received amount is independent of the advertised fee. No RegistrationRefund
association means no recorded tournament refund obligation. Review, receipt,
and association history is retained. These records do not change participation,
reserve a seat, or transfer money.

Future staff workflows must authorize the actor and commit review, receipt,
association, and participation changes atomically. Cancellation/refund workflows
must calculate the 10-business-day deadline, record the exact amount owed and actual
completion, and send required notifications. Shared persistence helpers use the
caller's transaction. These commands are not implemented.

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
See [migration notes](../../docs/migrations.md) for the reset and test boundaries.
