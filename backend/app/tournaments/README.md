# Tournament module

**Created**: 2026-10-26
**Last updated**: 2026-11-02

This module stores reusable `Tournament` and `TournamentSignup` records in the
domain database. Monomachia is one event using the same catalog and registration
APIs as future tournaments. Staff permissions apply across all tournaments.

## Catalog

`GET /api/tournaments` and `GET /api/tournaments/{id}` show public tournaments
to guests and signed-in users. Internal tournaments appear only for guild members
and admins; other callers receive 404 on direct internal-event reads. A supplied
invalid token returns 401 even on a guest-readable route. Only admins may
`POST /api/tournaments`; other signed-in users receive 403.

`GET /api/tournaments` returns a page with `items`, `total`, `limit`, and `offset`.
`name` is a case-insensitive match on the display name. `starts_from` and `starts_to`
are inclusive calendar dates for the event start in UTC−3. `starts_at` and `ends_at`
are the event dates. The registration window is `registration_opens_on` and
`registration_closes_on`. Hidden internal events stay out of the page for guests
and regular users. Each tournament still has a required unique slug. Create may omit
it. The API then builds it from the name, the modality when present, and the event
year. A duplicate slug returns 409. The frontend uses the returned event ID for signup.

The backend reads `regular_user`, `guild_member`, or `admin` only from a verified
Supabase token's Auth-managed `app_metadata.karlbruder_role`. Missing or unknown
values have regular-user access. User-editable `user_metadata` cannot grant a
role. Provision trusted roles through an authorized Supabase admin process.

## Signups

`POST /api/tournaments/{id}/signups` requires a verified token and registers its
owner. The body is JSON with the participant fields below. Minors upload the
parental term directly to object storage. They first call
`POST /api/tournaments/{id}/signups/parental-term/upload-url`, upload with the
returned presigned URL, then send `parental_term_storage_key` and
`parental_term_original_file_name` on create. The submitted email must match the
account email under the registration normalization rule. Clients cannot choose the owner, status, inscription number,
accepted versions, or staff safety note. Required declarations include a separate
truthful-information choice, which must be JSON `true`; image use is an
independent authorization/refusal choice. Missing, false, or nonboolean required
choices return 422.

Registration requires configured terms and regulation versions and an inclusive
opening/closing calendar-date window in fixed UTC-03:00. Staff closure, missing
configuration, or dates outside the window return 400. Active duplicate owners,
normalized emails, or normalized documents within a tournament return 409;
a cancelled signup does not block replacement. Capacity does not prevent a new
signup: it starts as `awaiting_payment` without a confirmed seat.

The inscription number is `T<tournament id>-<six-digit serial>-<Luhn digit>`.
It is a reference, not a credential. A tournament-local counter is allocated
while locking the tournament row so concurrent signups do not reuse numbers.

`GET /api/tournaments/{id}/signups/{inscription_number}` is available only to
the owner or an admin; other callers receive 404. `GET /api/tournaments/{id}/signups`
requires a verified token. Admins receive every registration in staff shape.
Everyone else receives only their own registrations in the owner-safe shape,
including cancelled rows. Owner responses exclude `safety_note` and acceptance IP,
while admin reads may include those staff fields. No public signup directory is exposed.
Do not log identity documents, contact details, or safety notes.

## Payment configuration and payment instructions

Inscription fees and payment deadlines stay on the **tournament** row (`inscription_fee_amount`,
`payment_due_at`). How participants pay the inscription fee lives in the **`payments` module**,
not on `tournaments`.

For each tournament, optional rows in `tournament_inscription_payment_configs` and
`pix_recipients` store the Pix key staff configure at create time. Membership dues and shop
checkout will get their own payment config tables later. They can reuse `pix_recipients` when
the guild shares one receiving key.

The public catalog and `TournamentRead` never expose Pix configuration. Admins pass `pix_key` on
`POST /api/tournaments` only.

A **tournament signup** is one person's registration in that event. It has its own inscription
number and status (for example `awaiting_payment`).

**Payment instructions** are not a separate database table. They are the owner-only JSON from
`GET /api/tournaments/{id}/signups/{inscription_number}/payment`. That route builds one screen
payload for the registrant:

- From the **tournament signup**: inscription number and current status.
- From the **tournament**: fee and deadline.
- From **`payments`**: `payment_options.pix.pix_key`, or null when not configured.
- From stored files on that registration: metadata for the latest payment proof, or null until
  proof uploads exist.

So the Pix key answers "where do I send inscription payment for this event?" Payment instructions answer
"everything this registrant needs for the payment step right now."

`GET /api/tournaments/{id}/signups/{inscription_number}/payment` returns those payment instructions
for the tournament registration owner only. Other callers, including admins, receive 404. There is
no tournament update route yet. Set or change inscription Pix configuration on an existing row with
a manual database update outside the repo.

Accepted terms and regulation versions, time, and request IP are recorded as evidence references.
`GET /api/tournaments/{id}/signups/{inscription_number}/parental-term` returns a short-lived
presigned download URL for the owner or an admin. The API does not stream file bytes.

Approved declaration wording, payment-proof uploads, and later payment/staff flows are still
required for a production registration journey.
