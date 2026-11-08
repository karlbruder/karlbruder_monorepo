# Taxonomy

**Created**: 2026-11-01
**Last updated**: 2026-11-08

These names are the shared vocabulary for the rest of the specifications.

## Application vocabulary

| Term | Meaning and implemented names |
| --- | --- |
| Account sign-up | Create a Supabase Auth account. Keep provider identifiers such as `signUp` and the `/account/sign-up` route |
| Guild | The organization is the guild. Its administrative area is the guild panel. Staff refers to people with administrative access |
| Tournament registration | Participate in an event through `TournamentRegistration`, `registration_number`, and `/api/tournaments/{tournament_id}/registrations`. The frontend entry is `/tournaments/registration` |
| Discipline | The tournament's sporting discipline, such as `longsword`. Keep the `discipline` field |
| Parental consent form | The minor's signed document. Use `parental_consent_form` in fields and document purpose, and `parental-consent-form` in routes |
| Stored file | `StoredFile` identifies a stored object. Shared metadata and storage operations belong to `app/core/files/` |
| Archived file | `ArchivedFile` preserves a captured content version. `archive_file` belongs to `app/core/files/`. The consuming domain owns purpose, validation, access, retention, and current-version selection |
| Registration document | `TournamentRegistrationDocument` associates a submitted file with a registration and its purpose |
| Acceptance | `RegistrationAcceptance` retains exact content and separate choices. Inline policies remain text. Linked documents use archived copies |
| Payment and refund | Payments owns generic `Payment` and `Refund` facts. Tournaments owns settings, proof reviews, and `RegistrationPayment` / `RegistrationRefund` associations |
| Awaiting payment | The participant still needs to pay. Generating a future gateway QR code leaves payment in this state |
| Awaiting payment confirmation | Use `awaiting_payment_confirmation` after a proof is uploaded. A future gateway flow can use the same label when payment has been initiated and confirmation is pending |
| Payment confirmed | Staff verified receipt or a future gateway confirmed success. Registration can separately show a confirmed place or paid waitlist |
| Payment verification | The staff workflow. Staff approve payment or reject the uploaded proof. Use payment proof review for the staff record and its history |
| New proof needed | The participant-facing label when staff reject the current proof and a replacement can be uploaded |
| Processing | Reserve this payment label for a future gateway that explicitly reports processing |

Dependencies run from consuming domains to shared capabilities. Future membership
and legal-policy examples explain reuse. They do not establish implemented features.
See [decision 0008](decisions/0008-shared-files-and-archives.md) for file ownership
and [decision 0009](decisions/0009-shared-payments-and-domain-associations.md) for
financial ownership. [Decision 0010](decisions/0010-database-evidence-guards.md)
explains the specific database guards and their limits.

Use registration in active tournament guidance. Preserve old names when explicitly
describing historical material. Account sign-up remains a separate operation.

## Local and cloud

Local environment uses development mode. The software runs on a laptop through `compose.yml`, with development servers with hot-reload and a local PostgreSQL container.

A cloud environment uses production builds and configuration. The software runs on an EC2 host through `compose.production.yml`, with built images, Nginx, and hosted Supabase.

Currently, there are two cloud environments, `dev` and `prod`. In the future, there will be more (eg. `uat`, `stg`).

| | `dev` | `prod` |
| --- | --- | --- |
| Landing names | `dev.karlbruder.com` | `karlbruder.com`, `prod.karlbruder.com` |
| Application names | `app-dev.karlbruder.com` | `app.karlbruder.com`, `app-prod.karlbruder.com` |

The two hosts differ by hostname, Elastic IP, instance size, image namespace, and the secrets on that host. They use the same Compose file.

## What production means

Production, used alone, means the `prod` cloud environment.

Say production mode or build when the sentence is about the cloud stack. Other cloud environments use that stack too.
