# Data storage

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Shared platform foundation and tournament persistence |
| Applications | backend and operational services |
| Sources | [#7](https://github.com/karlbruder/karlbruder_monorepo/issues/7), [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); `backend/database.py`, `backend/settings.py`, and existing configuration documentation |

## Goal

Persist Karlbrüder domain data consistently across local and deployed environments while preserving the separation between application data and managed authentication.

## Rules

- **DATA-001:** Domain data uses PostgreSQL. Locally, `compose.yml` supplies a Docker PostgreSQL database; in production, the backend uses hosted Supabase PostgreSQL. Both hold domain data in `public`. `DATABASE_URL` selects the environment's destination. Production `compose.prod.yml` has no PostgreSQL service. Supabase Auth remains hosted in both environments.
- **DATA-002:** Domain tables, indexes, and migrations belong in `public`. Supabase-managed `auth` objects must not be modified by application migrations.
- **DATA-003:** `AUTH_DATABASE_URL` is a separate connection used by the current Auth database diagnostic. It is not the setting for verifying access tokens. Token verification uses the public project root `SUPABASE_URL` and public signing keys.
- **DATA-004:** Local and deployed domain data are independent. Reusing migration history aligns schema, not data. No automatic local/remote synchronization is assumed.
- **DATA-005:** Schema changes use versioned migrations. Issue #20 calls for Alembic, which is already a backend dependency but has no migration tree in the inspected checkout. Apply the same domain migration history to supported environments.
- **DATA-006:** Persist unique inscription numbers and prevent non-cancelled registrations from sharing the same tournament plus user UUID, normalized email, or normalized document. Cancelled participation is excluded from those duplicate checks even while a refund awaits processing. Follow REG-012's comparison normalization and retain the original registration email for display/history. Send notifications to the current account email under COM-008. Coordinate confirmation and capacity assignment transactionally. Admin-only manual Supabase reopening must preserve these invariants.
- **DATA-007:** Registration ownership directly uses the existing Supabase `auth.users.id` UUID from the verified token subject. Users already have that identity before tournament registration. An account email change leaves ownership and registration validity unchanged. No separate user identity or intermediate owner mapping is required. Do not duplicate Supabase passwords, create a second authentication store, or modify managed Auth objects.
- **DATA-008:** Credentials are supplied through environment/secrets configuration. No private database URI belongs in browser bundles or source. Diagnostic responses must not expose passwords or raw internal errors.
- **DATA-009:** Private uploaded files, including all payment-proof versions and scanned parental terms, use Amazon S3 in production and Ministack S3 emulation locally once file storage is implemented. Backend authorization applies in both environments. Participants see only their latest proof; authorized staff can audit all submissions. PRIV-011 establishes interim indefinite retention for covered records. Backup/recovery and deletion-request procedures remain separate work. Private object storage is separate from public landing-site assets.

## Storage by environment

| Data | Local development | Production |
| --- | --- | --- |
| Application identity | Hosted Supabase Auth, managed `auth` schema | Hosted Supabase Auth, managed `auth` schema |
| Domain records | Docker PostgreSQL, `public` schema | Hosted Supabase PostgreSQL, `public` schema |
| Private uploaded files | Ministack S3 emulation, planned | Amazon S3 |

The backend uses the same domain migrations and S3-facing storage logic across environments. Configuration selects endpoints, credentials, bucket, and database destination. The optional hosted Auth database diagnostic connection is distinct from the local domain connection; it is not a reason to run a second local Auth database.

## Observed configuration

The backend has SQLAlchemy connection helpers and separate domain/Auth diagnostic paths. `/health/db` queries domain connectivity and `public`; `/health/auth` queries the configured Auth database and `auth`. The latter is created on demand. `/api/users/me` verifies JWTs without requiring a local users table or Auth database query.

The source inspection on 17 October 2026 did not establish a live connection, migration application, backup schedule, or recovery test. Health responses expose configured destinations with passwords redacted; visibility of diagnostics to public callers needs an agreed deployment policy.

## Acceptance criteria

- **DATA-AC-001:** The same backend domain logic connects to either supported domain destination by changing configuration rather than duplicating business code.
- **DATA-AC-002:** Application migrations create or alter only their authorized domain objects, leaving managed Auth objects unchanged.
- **DATA-AC-003:** Duplicate concurrent registration attempts cannot bypass the agreed database uniqueness constraints.
- **DATA-AC-004:** Domain diagnostics and Auth diagnostics report their own connection failures independently and do not expose credentials.
- **DATA-AC-005:** A fresh supported domain database can reach the required schema using the versioned migrations once they are delivered.
- **DATA-AC-006:** Once file storage is delivered, the backend can store and retrieve an authorized proof through Ministack locally and S3 in production without changing the storage business rules.

## Open questions

No separate product questions. Interim retention is defined by [privacy rules](../tournaments/consent-and-privacy.md#rules); deletion-request policy remains [PRIV-Q4](../tournaments/consent-and-privacy.md#open-questions). Migration, backup, and recovery operations are owned by the [deployment plan](deployment.md#implementation-and-operations-decisions).

## Implementation and operations decisions

- Define S3/Ministack bucket, endpoint, credentials, persistence, and object-deletion configuration in the storage implementation plan. Apply the retention policy chosen in the privacy spec rather than defining a second one here.
- Define which health-diagnostic fields are exposed to public callers versus protected access, while preserving DATA-008's ban on credential disclosure. This is an operational/API design decision, not another application-role hierarchy.

## Related specifications

[Architecture](../architecture.md), [registration](../tournaments/registration.md), [capacity](../tournaments/capacity-and-waitlist.md), [privacy](../tournaments/consent-and-privacy.md), [deployment](deployment.md).
