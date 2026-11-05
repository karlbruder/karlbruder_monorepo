# Data storage

**Created**: 2026-10-17
**Last updated**: 2026-11-05

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Shared platform foundation and tournament persistence |
| Applications | backend and operational services |
| Sources | [#7](https://github.com/karlbruder/karlbruder_monorepo/issues/7), [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20), `backend/app/core/db/`, `backend/config/`, and existing configuration documentation |

## Goal

Persist Karlbrüder domain data consistently across local and deployed environments while preserving the separation between application data and managed authentication.

## Rules

- **DATA-001:** Domain data uses PostgreSQL. Development mode uses the Docker PostgreSQL service in `compose.yml`. Production mode uses hosted Supabase PostgreSQL. Both modes hold domain data in `public`. The backend builds that connection from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. `compose.production.yml` has no PostgreSQL service. Supabase Auth remains hosted in both modes.
- **DATA-002:** Domain tables, indexes, and migrations belong in `public`. Supabase-managed `auth` objects must not be modified by application migrations.
- **DATA-003:** `AUTH_DB_HOST`, `AUTH_DB_PORT`, `AUTH_DB_NAME`, `AUTH_DB_USER`, and `AUTH_DB_PASSWORD` are required. They form a separate connection used by the current Auth database diagnostic. They are not the settings for verifying access tokens. Token verification uses the public project root `SUPABASE_URL` and public signing keys.
- **DATA-004:** Local and deployed domain data are independent. Reusing migration history aligns schema, not data. No automatic local/remote synchronization is assumed.
- **DATA-005:** Schema changes use Alembic migrations in `backend/alembic/`. Apply the same domain migration history to supported environments. Follow the [migration notes](../../docs/database-migrations.md) for the clean-baseline reset prerequisite and application procedure.
- **DATA-006:** Persist unique registration numbers and prevent non-cancelled registrations from sharing the same tournament plus user UUID, normalized email, or normalized document. Cancelled participation is excluded from those duplicate checks even while a refund awaits processing. Follow REG-012's comparison normalization and retain the original registration email for display/history. Send notifications to the current account email under COM-008. Coordinate confirmation and capacity assignment transactionally. Admin-only manual Supabase reopening must preserve these invariants.
- **DATA-007:** Registration ownership directly uses the existing Supabase `auth.users.id` UUID from the verified token subject. Users already have that identity before tournament registration. An account email change leaves ownership and registration validity unchanged. No separate user identity or intermediate owner mapping is required. Do not duplicate Supabase passwords, create a second authentication store, or modify managed Auth objects.
- **DATA-008:** Credentials are supplied through environment/secrets configuration. No private database URI belongs in browser bundles or source. Diagnostic responses must not expose passwords or raw internal errors.
- **DATA-009:** Private uploaded files, including all payment-proof versions and scanned parental consent forms, use Amazon S3 in production and Ministack S3 emulation locally. Backend authorization applies in both environments. Participants see only their latest proof. Authorized staff can review all submissions. PRIV-011 establishes interim indefinite retention for covered records. Backup/recovery and deletion-request procedures remain separate work. Private object storage is separate from public landing-site assets.

## Storage by environment

| Data | Local development | Production |
| --- | --- | --- |
| Application identity | Hosted Supabase Auth, managed `auth` schema | Hosted Supabase Auth, managed `auth` schema |
| Domain records | Docker PostgreSQL, `public` schema | Hosted Supabase PostgreSQL, `public` schema |
| Private uploaded files | Ministack S3 emulation | Amazon S3 |

The backend uses the same domain migrations and S3-facing storage logic across environments. Configuration selects endpoints, credentials, bucket, and database destination. The optional hosted Auth database diagnostic connection is distinct from the local domain connection; it is not a reason to run a second local Auth database.

## Database resources and model timestamps

`app/core/db/` owns the shared model base, sync/async engine factories, and session
scopes. FastAPI lifespan initializes both engine/session factories and disposes
the engines on shutdown. Current domain workflows use synchronous sessions and
own their commits and rollbacks. Session scopes do not commit implicitly.

Mapped models share integer primary keys and timezone-aware `created_at` and
`updated_at`. Columns begin with `id`, `created_at`, and `updated_at`, followed
by domain fields. SQLAlchemy supplies creation defaults and advances `updated_at` on
updates. Direct SQL writers remain responsible for update timestamps. These fields
do not replace domain evidence times, such as acceptance, review, or payment time.
They do not introduce UUID identity columns, soft deletion, or weaker evidence guards.

The [migration guide](../../docs/database-migrations.md) owns the initial-schema
reset prerequisite and verification procedure.

## File metadata ownership

For the rationale, alternatives and future legal-policy reuse, see
[decision 0008](../decisions/0008-shared-files-and-archives.md).

`StoredFile` in `app/core/files/models.py` stores metadata for one object in
`public.stored_files`. It has a unique storage key, original file name, content
type, nonnegative size, and creation time. It has no tournament reference or
domain-specific file type or size limit. `app/core/files/storage.py` owns the
shared S3 operations without depending on domain modules.

Each consuming domain owns the file's meaning, permissions, validation policy
and lifecycle. `TournamentRegistrationDocument` links a registration and a
StoredFile through real foreign keys. It owns the document type and submission
time. Its workflows enforce the tournament upload rules and preserve every
proof submission. A file identifier alone never authorizes access. The shared
metadata model does not introduce membership, inventory, or generic file APIs.

## Preserved acceptance content

`ArchivedFile` in core files references StoredFile and retains SHA-256,
`archived_at`, and optional source/final URLs. `archive_file` stores caller-validated
bytes under a fresh key. The domain owns the transaction, cleanup on database
failure, policy purpose, validation, access, retention, and current-version selection.
Future terms/privacy capabilities can reuse this mechanism under their own rules,
as illustrated in decision 0008.

`RegistrationAcceptance` retains separate choices, exact inline policies and draft
declarations, and linked archive IDs. Inline text stays text. Linked documents use
archived copies and authorized attachment downloads. There is no generic file-access
endpoint or automatic retention expiry.

Database guards prevent changes to acceptance/archive rows and to file metadata
referenced by archives. They do not authorize actors or prevent replacement of S3
bytes. See [decision 0010](../decisions/0010-database-evidence-guards.md) for the
protected invariants and limits.

## Shared financial records

The boundary and future consumer examples are recorded in
[decision 0009](../decisions/0009-shared-payments-and-domain-associations.md).
The database enforcement rationale is recorded in
[decision 0010](../decisions/0010-database-evidence-guards.md).

Payments owns Payment and Refund. They retain financial amounts, verification,
obligation time and completion evidence without tournament or membership references.
TournamentPaymentSettings, PaymentProofReview and the registration payment/refund
associations belong to tournaments. Domain associations point to shared facts.
The reverse dependency does not exist. Tournament proof eligibility, full-refund
amount equality, one payment/obligation and deadline rules stay in that domain.
Future membership can add its own associations without inheriting tournament rules.

## Observed configuration

Use the [backend setup guide](../../backend/README.md#setup-and-development)
for database and storage settings, and [diagnostics](../../backend/README.md#diagnostics)
for connectivity responses. Auth diagnostics use a separate connection created on
demand. JWT verification does not query an Auth database or a local users table.

The [S3 runbook](../../docs/runbooks/application-files-s3-bucket.md) owns cloud bucket
configuration and host permissions. The [environment example](../../backend/.env.example)
and [local setup](../../README.md#local-setup-with-docker-compose) own local endpoints.
Tests mock storage calls instead of starting Ministack.

Source inspection does not establish live connectivity, migration application,
backups, or recovery. Public diagnostic responses redact passwords but expose
configured destinations. Their public-field policy remains unresolved below.

## Acceptance criteria

- **DATA-AC-001:** The same backend domain logic connects to either supported domain destination by changing configuration rather than duplicating business code.
- **DATA-AC-002:** Application migrations create or alter only their authorized domain objects, leaving managed Auth objects unchanged.
- **DATA-AC-003:** Duplicate concurrent registration attempts cannot bypass the agreed database uniqueness constraints.
- **DATA-AC-004:** Domain diagnostics and Auth diagnostics report their own connection failures independently and do not expose credentials.
- **DATA-AC-005:** A fresh supported domain database can reach the required schema using the versioned migrations.
- **DATA-AC-006:** The backend can store and retrieve an authorized proof through Ministack locally and S3 in production without changing the storage business rules.

## Open questions

No separate product questions. Interim retention is defined by [privacy rules](../tournaments/consent-and-privacy.md#rules); deletion-request policy remains [PRIV-Q4](../tournaments/consent-and-privacy.md#open-questions). Migration, backup, and recovery operations are owned by the [deployment plan](deployment.md#implementation-and-operations-decisions).

## Implementation and operations decisions

- Bucket and endpoint configuration are owned by the linked guides. Backup, recovery, and deletion-request procedures remain separate operational work. Apply PRIV-011's interim indefinite retention and keep PRIV-Q4 unresolved until its policy is decided.
- Define which health-diagnostic fields are exposed to public callers versus protected access, while preserving DATA-008's ban on credential disclosure. This is an operational/API design decision, not another application-role hierarchy.

## Related specifications

[Architecture](../architecture.md), [registration](../tournaments/registration.md), [capacity](../tournaments/capacity-and-waitlist.md), [privacy](../tournaments/consent-and-privacy.md), [deployment](deployment.md).
