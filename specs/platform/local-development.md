# Local development

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Platform foundation and contributor onboarding |
| Applications | landing, frontend, backend, local PostgreSQL; Ministack when file storage is implemented |
| Sources | Product-owner stack clarification; [decision 0003](../decisions/0003-local-and-production-stacks.md); [#6](https://github.com/karlbruder/karlbruder_monorepo/issues/6), [#8](https://github.com/karlbruder/karlbruder_monorepo/issues/8), [#22](https://github.com/karlbruder/karlbruder_monorepo/issues/22); current source and READMEs |

## Goal

Let a contributor understand the monorepo, configure the relevant applications, and verify the frontend-to-backend-to-database flow without guessing which environment is in use.

## Rules

- **DEV-001:** The root README maps the applications and points to application-specific setup, environment examples, specs, and operational procedures.
- **DEV-002:** Docker Compose provides the local domain PostgreSQL, backend, and application frontend. The public website can run separately through its own package scripts; it is not currently a Compose service.
- **DEV-003:** Local domain data uses the Compose database unless an explicit `DATABASE_URL` selects another destination. Outside Compose, `DATABASE_URL` is required by the current backend.
- **DEV-004:** Application authentication uses the configured hosted Supabase project. Local domain PostgreSQL does not imply a locally hosted Supabase Auth system or synchronized remote data.
- **DEV-005:** Environment examples describe public configuration and required secret names without containing real secrets. Setup documents identify which values are needed for the chosen workflow.
- **DEV-006:** Retain the existing default development ports rather than introducing a new port-selection decision: current Compose uses frontend 5173, backend 8000, and PostgreSQL 5432. Align forwarding, health checks, and allowed origins with those settings as implementation work. Local servers may publish their development ports; production's Nginx-only exposure is a different stack boundary.
- **DEV-007:** Contributors can distinguish application liveness, domain database connectivity, and optional Auth database diagnostics. A missing Auth database diagnostic connection must not be described as a domain database failure.
- **DEV-008:** Verification commands correspond to the relevant application's actual scripts and dependencies. Report skipped external integration checks rather than describing them as passed.
- **DEV-009:** When file storage is implemented, the local Compose stack includes Ministack for S3 emulation. Configure the backend's S3 endpoint for Ministack, using local buckets and credentials. Production uses AWS S3 instead. Ministack does not replace the ordinary local PostgreSQL container.
- **DEV-010:** The application's browser-facing `/api` prefix is preserved when forwarding to backend routes, matching production. The local frontend may use its development-server proxy; the production Nginx container does not need to be copied into the local stack.
- **DEV-011:** Application email integration uses SMTP, with AWS SES as the production provider. The local SMTP decision is deferred; the likely approach is real SES with real AWS/SES credentials supplied through local backend configuration. Do not add a mail emulator or require a decision now. Ministack remains the selected local S3 emulator.

## Intended local stack

| Component | Local responsibility |
| --- | --- |
| Frontend container | Development server and frontend application |
| Backend container | API/domain behavior, using the same application rules as production |
| PostgreSQL container | Local domain tables in `public` |
| Hosted Supabase Auth | Application sign-in and verified user identity; still external in local development |
| Ministack, planned addition | Local S3 storage when file upload/storage is implemented |

Production instead uses `compose.prod.yml` with Nginx/frontend/backend containers, no PostgreSQL container, and Supabase's hosted `public` schema for domain data. See the [architecture comparison and diagrams](../architecture.md#environment-comparison).

## Observed configuration and gaps

Source inspection on 17 October 2026 found:

| Area | Observed baseline |
| --- | --- |
| Domain PostgreSQL | Compose service `db`, PostgreSQL 17, host binding `127.0.0.1:5432`, persistent volume |
| Backend | Port 8000, `/health`, `/health/db`, `/health/auth`, `/api/users/me` |
| Frontend | Compose development target starts Vite on 5173 and publishes 5173 |
| Public website | `landing/package.json` provides start, build, and test scripts |
| Auth | Hosted project selected by configuration; frontend has Google SDK sign-in and backend token verification |

Changes since the 17 October baseline, confirmed by source inspection on 29 October 2026:

- The frontend development container health check now probes Vite at `127.0.0.1:5173`.
- `frontend/vite.config.ts` now proxies same-origin `/api` requests to the backend without removing the prefix. This is the local Compose route for application API calls.
- `frontend/nginx.conf` now preserves `/api` when forwarding to the backend. Local Compose uses Vite, not the frontend image's Nginx stage.

Remaining inconsistencies and implementation gaps:

- The backend CORS allowlist still names only `http://localhost:3000`. Direct cross-origin browser calls from the Vite origin at `http://localhost:5173` to the backend at `http://localhost:8000` are outside that allowlist; the normal same-origin `/api` proxy path does not depend on it.
- `src/pages/Home.tsx` and `src/pages/Health.tsx` are not mounted by the current frontend app. The Health page also requests `/api/health` paths while backend diagnostics use `/health`; the UI and API paths need reconciliation.
- The unused Home page describes authentication as absent, while the current application entry point has Google sign-in. Separate email/password/recovery flows remain unverified.
- The frontend production build excludes `.env` and defines no explicit Supabase build arguments. Build-time browser configuration needs implementation before that image is treated as a working production deployment.

The README review on 17 October 2026 corrected the root port/routing instructions, replaced frontend template documentation, added landing setup documentation, and removed nonexistent backend integration-test instructions. Environment examples now match the frontend client's `VITE_SUPABASE_ANON_KEY` name and default Compose domain data to local PostgreSQL. The later forwarding and health-check fixes resolve those specific configuration gaps; the remaining items above still need separate work.

The 17 October specification pass did not run services or application tests to establish runtime health. The 29 October update above reflects source inspection, not a new end-to-end runtime check.

## Acceptance criteria

- **DEV-AC-001:** A new contributor can identify each application and the correct configuration instructions from the root README.
- **DEV-AC-002:** The documented Compose path starts the expected services, and each health check targets the service actually running in that mode.
- **DEV-AC-003:** A frontend request reaches the expected backend endpoint and the backend connects to the intended domain database without manual route guessing.
- **DEV-AC-004:** Optional remote integration checks are explicitly enabled and identify their target without disclosing credentials.
- **DEV-AC-005:** Local domain records are written to Docker PostgreSQL's `public` schema while authentication still uses the configured hosted Supabase Auth project.
- **DEV-AC-006:** Once storage is implemented, file integration checks use Ministack rather than production S3 and do not require switching application business logic.

## Open questions

None about local ports, database placement, hosted authentication, or the `/api` contract.

## Implementation decisions

- Keep the current separate landing-development command unless a future development-workflow task intentionally adds it to Compose. This possible tooling change is not an outstanding product requirement.
- Choose frontend and end-to-end tooling to verify feature acceptance criteria as part of implementation. Issue #21 aligned the observed forwarding and health-check mismatches with the selected local settings; live browser acceptance remains a separate verification step.

Local SMTP is a deferred implementation choice, likely SES with real credentials. Existing development ports and `/api` forwarding are implementation settings, not open product questions.

## Related specifications

[Architecture](../architecture.md), [data storage](data-storage.md), [identity](../identity/authentication-and-access.md), [runbooks](../../docs/runbooks/README.md).
