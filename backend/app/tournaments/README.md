# Tournament module

**Created**: 2026-10-26
**Last updated**: 2026-11-03

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
Clients cannot choose these evidence values, the owner, `registration_status`,
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

The payments domain owns optional `TournamentPaymentSettings`, with a unique
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

A proof is evidence, not a verified receipt or a transfer. This checkpoint does
not add payment decisions, refunds, notifications, acceptance-history storage,
or linked-policy archiving. Those remaining #69 checkpoints and #60 consume the
renamed contracts. The frontend entry remains `/tournaments/registration`.

## Migration boundary

Revision `20261103_0001` creates the current schema directly. The product owner
authorized a clean baseline for this pre-data refactor. The previous revision
chain and the intermediate rename migration are removed. There is no old-schema
upgrade or old request-field/route alias. The development reset must include
`public.alembic_version`, with Supabase-managed `auth` objects left intact.
See [migration notes](../../docs/migrations.md) for the reset and test boundaries.
