# Local development

**Created**: 2026-10-17
**Last updated**: 2026-11-04

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Platform foundation and contributor onboarding |
| Applications | landing, frontend, backend, local PostgreSQL, Ministack for private files |
| Sources | Product-owner stack clarification; [decision 0003](../decisions/0003-local-and-production-stacks.md); [#6](https://github.com/karlbruder/karlbruder_monorepo/issues/6), [#8](https://github.com/karlbruder/karlbruder_monorepo/issues/8), [#22](https://github.com/karlbruder/karlbruder_monorepo/issues/22); current source and READMEs |

## Goal

Let a contributor understand the monorepo, configure the relevant applications, and verify the frontend-to-backend-to-database flow without guessing which environment is in use.

## Rules

- **DEV-001:** The root README maps the applications and points to application-specific setup, environment examples, specs, and operational procedures.
- **DEV-002:** Local Docker Compose provides the public website, the application frontend, the backend, and domain PostgreSQL. That is development mode. Production mode runs that public site as the landing container in `compose.production.yml` on both cloud environments.
- **DEV-003:** Local domain data uses the Compose database unless `DB_HOST` and `DB_NAME` select another destination. Outside Compose, those database settings are required by the current backend.
- **DEV-004:** Application authentication uses the configured hosted Supabase project. Local domain PostgreSQL does not imply a locally hosted Supabase Auth system or synchronized remote data.
- **DEV-005:** Environment examples describe public configuration and required secret names without containing real secrets. Setup documents identify which values are needed for the chosen workflow.
- **DEV-006:** Retain the existing default development ports rather than introducing a new port-selection decision: current Compose uses landing 3000, frontend 5173, backend 8000, and PostgreSQL 5432. Align forwarding, health checks, and allowed origins with those settings as implementation work. Local servers may publish their development ports; production's Nginx-only exposure is a different stack boundary.
- **DEV-007:** Contributors can distinguish application liveness, domain database connectivity, and optional Auth database diagnostics. A missing Auth database diagnostic connection must not be described as a domain database failure.
- **DEV-008:** Verification commands correspond to the relevant application's actual scripts and dependencies. Report skipped external integration checks rather than describing them as passed.
- **DEV-009:** Local Compose includes Ministack for S3 emulation. Configure the backend's S3 endpoint for Ministack, using local buckets and credentials. Production uses AWS S3 instead. Ministack does not replace the ordinary local PostgreSQL container.
- **DEV-010:** The application's browser-facing `/api` prefix is preserved when forwarding to backend routes, matching production. The local frontend may use its development-server proxy; the production Nginx container does not need to be copied into the local stack.
- **DEV-011:** Application email integration uses SMTP, with AWS SES as the production provider. The local SMTP decision is deferred; the likely approach is real SES with real AWS/SES credentials supplied through local backend configuration. Do not add a mail emulator or require a decision now. Ministack remains the selected local S3 emulator.

## Intended local stack

| Component | Local responsibility |
| --- | --- |
| Landing container | Public website development server |
| Frontend container | Development server and frontend application |
| Backend container | API/domain behavior, using the same application rules as production |
| PostgreSQL container | Local domain tables in `public` |
| Hosted Supabase Auth | Application sign-in and verified user identity; still external in local development |
| Ministack | Local S3 on port 4566. The backend calls `http://ministack:4566`. Presigned URLs use `http://localhost:4566`. `ministack/bootstrap-ministack.sh` creates `kb-local-bucket` and allows browser `PUT` from `http://localhost:5173`. |

Production mode uses `compose.production.yml` with Nginx, landing, frontend, and backend containers, no PostgreSQL container, and Supabase's hosted `public` schema for domain data. The `dev` and `prod` environments both use that file. See the [stack comparison and diagrams](../architecture.md#stack-comparison).

## Observed configuration and gaps

Local Compose uses Vite for frontend serving and `/api` forwarding. It runs no
Nginx service. Production uses a separate edge Nginx and the frontend's static
Nginx image. Both preserve the API prefix.

Use the [root setup guide](../../README.md#local-setup-with-docker-compose) for
service addresses, environment files, source mounts, and rebuild commands.
Application READMEs own [backend checks](../../backend/README.md#tests-and-lint)
and [frontend checks](../../frontend/README.md#build-and-checks). Backend tests use
an isolated Compose database with no published ports. Frontend checks use the
development image.

Remaining gap:

- The backend CORS allowlist names only `http://localhost:3000`. Direct cross-origin browser calls from Vite at `http://localhost:5173` to the backend at `http://localhost:8000` are outside that allowlist. The normal same-origin `/api` proxy path does not depend on it.

Historical context: the 17 October 2026 README review corrected setup instructions. The 29 October inspection recorded forwarding and health-check fixes, and the 31 October update recorded the Compose stacks. Those inspections and the current baseline describe source configuration. They do not establish runtime health, hosted provider configuration, or end-to-end browser acceptance.

## Acceptance criteria

- **DEV-AC-001:** A new contributor can identify each application and the correct configuration instructions from the root README.
- **DEV-AC-002:** The documented Compose path starts the expected services, and each health check targets the service actually running in that mode.
- **DEV-AC-003:** A frontend request reaches the expected backend endpoint and the backend connects to the intended domain database without manual route guessing.
- **DEV-AC-004:** Optional remote integration checks are explicitly enabled and identify their target without disclosing credentials.
- **DEV-AC-005:** Local domain records are written to Docker PostgreSQL's `public` schema while authentication still uses the configured hosted Supabase Auth project.
- **DEV-AC-006:** File integration checks use Ministack rather than production S3 and do not require switching application business logic.

## Open questions

None about local ports, database placement, hosted authentication, or the `/api` contract.

## Implementation decisions

- Local Compose includes the landing development server. Landing Jest and frontend Vitest do not use `compose.test.yml`, because those suites do not need the private test database. Run them with `docker compose run --rm --no-deps` against the local development services. Production landing deploys with the application workflow when landing files change.
- Choose frontend and end-to-end tooling to verify feature acceptance criteria as part of implementation. Issue #21 aligned the observed forwarding and health-check mismatches with the selected local settings; live browser acceptance remains a separate verification step.

Local SMTP is a deferred implementation choice, likely SES with real credentials. Existing development ports and `/api` forwarding are implementation settings, not open product questions.

## Related specifications

[Architecture](../architecture.md), [data storage](data-storage.md), [identity](../identity/authentication-and-access.md), [runbooks](../../docs/runbooks/README.md).
