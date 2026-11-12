# Deployment

**Created**: 2026-10-17
**Last updated**: 2026-11-12

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Production Compose stack on one EC2 host, and how that stack is deployed |
| Applications | landing, frontend, backend, AWS, Supabase |
| Sources | Product-owner stack clarification; [decision 0003](../decisions/0003-local-and-production-stacks.md); [#11](https://github.com/karlbruder/karlbruder_monorepo/issues/11), [#12](https://github.com/karlbruder/karlbruder_monorepo/issues/12), [#25](https://github.com/karlbruder/karlbruder_monorepo/issues/25), [#13](https://github.com/karlbruder/karlbruder_monorepo/issues/13), [#23](https://github.com/karlbruder/karlbruder_monorepo/issues/23), [#42](https://github.com/karlbruder/karlbruder_monorepo/issues/42); private frontend deployment draft |

## Goal

Host the public website and application through verifiable deployment paths.
This specification owns requirements. The [deployment guide](../../docs/deployment.md)
owns current infrastructure details and release mechanics.

## Shared rules

- **DEP-001:** Production infrastructure belongs in the Karlbrüder AWS account. The landing account-migration issue moves hosting away from a personal account.
- **DEP-002:** Both cloud environments run production mode through `compose.production.yml`, containing Nginx, landing, frontend, and backend containers. Supabase supplies hosted Auth and PostgreSQL. Domain data uses `public`. There is no PostgreSQL container in production mode.
- **DEP-003:** Human access, application credentials, and workflow credentials have separate responsibilities. Use authorized secret/configuration mechanisms. Never commit cloud or database credentials.
- **DEP-004:** Prod answers the landing names `karlbruder.com` and `prod.karlbruder.com`, and the application names `app.karlbruder.com` and `app-prod.karlbruder.com`. Dev answers `dev.karlbruder.com` for the landing site and `app-dev.karlbruder.com` for the application. Nginx sends a landing name to the landing container. It sends `/api` and `/api/...` on an application name to the backend unchanged, and every other application request to the frontend container. Frontend deep links and Supabase callbacks must work through this entry point.
- **DEP-005:** Cloudflare nameservers serve DNS. Each public name above is a proxied A record to that environment's EC2 Elastic IP. Cloudflare manages public TLS and redirects HTTP 80 to HTTPS 443. The origin uses a self-signed certificate on Nginx with HTTPS 443 and Cloudflare Full mode. A test environment is required before live operation.
- **DEP-006:** A deploy verification checks the expected application release and relevant API/database behavior. Artifact publication alone does not verify deployment.
- **DEP-007:** Application file storage uses Amazon S3. Application email uses AWS SES via SMTP. Configure backend access to these services; the local Ministack emulator is not a production service.
- **DEP-008:** Only Nginx publishes a production application host port: 443. The frontend and backend communicate over the Compose network and do not publish host ports. Port 80 redirection happens at Cloudflare, preserving the HTTPS-only EC2 origin.
- **DEP-009:** Each cloud environment sends production container standard output and standard error to its service’s Terraform-managed CloudWatch log group. Retain logs indefinitely and protect the group from Terraform destruction. Configure CloudWatch Logs data protection policies for the backend log groups in dev and prod. Verify masking with synthetic values that match the selected identifiers.
- **DEP-010:** Backend startup requires a Sentry DSN. Monitoring defaults to off in every environment. Deployed dev and prod explicitly enable it to send eligible errors and filtered traces. The SDK captures eligible standard-library error logs as error events. Structlog records stay in backend logs without creating Sentry error events through the logging integration. Storage failures returned as HTTP 503 are logged with their exception chain. Identify telemetry by service, environment, and the built artifact release. Exclude health traces. Retain failed transactions and sample successful ones at a configurable rate that defaults to 10%. Do not enable profiling. Use Sentry’s default SDK data handling except for request bodies and frame locals, which are disabled. Associate authenticated events with the verified user. Keep Uvicorn access and server logs out of Sentry. Preserve CloudWatch delivery under DEP-009.
- **DEP-011:** Browser Sentry defaults to off. Enable it with each site’s own public DSN. Browser builds use `ENV_NAME` for the deployment environment and `GIT_SHA` for the artifact release. A missing browser DSN leaves monitoring off. The landing site sends errors only. The authenticated frontend sends errors and React Router traces. Use the SDK’s trace sampling with a configurable 10% default. Use Session Replay only in the authenticated frontend. Mask text and input values, block media and signed document download links, and disable network body capture. Upload replays for sessions with a captured error by default. The ordinary session sample rate is configurable and defaults to 0%. Skip monitoring on authentication callback loads that carry credentials.

## Production Compose topology

The complete application stack is defined by `compose.production.yml`:

| Component | Responsibility |
| --- | --- |
| Nginx container | HTTPS origin on published port 443 with a self-signed certificate. Landing hostnames go to the landing container. On an application hostname, `/api` goes to the backend and other requests go to the frontend |
| Landing container | Serves the built public site, including SPA route fallback, on an internal Compose port |
| Frontend container | Serves the built application, including SPA route fallback, on an internal Compose port |
| Backend container | FastAPI domain logic, authorization, persistence, file access, and email on an internal Compose port |
| Hosted Supabase | Supabase Auth plus PostgreSQL with domain records in `public` and managed identity in `auth` |
| Amazon S3 | Restricted application files and payment proofs |
| AWS SES SMTP | Application notification delivery |
| Cloudflare | Authoritative DNS, proxied A records for the landing and application names to that environment's Elastic IP, edge TLS certificate, and HTTP-to-HTTPS redirect |

The origin uses the self-signed certificate and Cloudflare Full mode required by
DEP-005. Keep public names proxied and enable the edge HTTPS redirect.

## Public website

The public site is the landing container on the shared application host.
Registration links target the application. Account/DNS cutover must be verified
before retiring the old host. Build-time link configuration is documented in
[build inputs](../../docs/deployment.md#build-inputs).

## Terraform workspaces

Keep cloud environments separate through `dev` and `prod` workspaces. Workload
Terraform rejects other workspaces. See the [deployment guide](../../docs/deployment.md#terraform-workspaces)
for current naming, tags, state, and infrastructure settings.

## Supabase auth email identity

Supabase Auth mail uses the shared SES identity for `karlbruder.com`. It is separate
from backend application notifications under DEP-007. Auth templates use Portuguese
under AUTH-011. Follow the [SES runbook](../../docs/runbooks/supabase-auth-email-ses.md)
for provisioning, DNS, and SMTP configuration.

## Application host

Use Session Manager for routine host access. Keep SSH and origin HTTP closed.
Require IMDSv2 with hop limit 2 for container access to the instance role.
[Decision 0005](../decisions/0005-container-access-to-instance-role.md) records the
accepted shared authority and safeguards. The [deployment guide](../../docs/deployment.md#application-host)
records current sizing, networking, bootstrap, and monitoring.

## Application files bucket

Keep application uploads private, require HTTPS, and retain bucket versioning.
Limit the host's object permissions to its environment's bucket. Browser CORS
does not grant public reads. Provisioning, secret values, and verification belong
to the [S3 runbook](../../docs/runbooks/application-files-s3-bucket.md).
Versioning does not establish a tested recovery process or prevent byte replacement.

## Application image deploy

Release images through ECR and update the selected host through Session Manager.
Apply domain migrations before API workers start. A migration failure prevents API
startup. Keep managed Supabase `auth` objects outside application migrations.

One GitHub OIDC role covers build, publication, and deployment in both cloud
environments under [decision 0004](../decisions/0004-shared-github-actions-role.md).
Preserve its safeguards and accepted authority. Operator policies belong in the
[access runbook](../../docs/runbooks/github-actions-access.md).

The [deployment guide](../../docs/deployment.md#workflow-and-image-selection)
describes triggers, image selection, build inputs, host updates, and public release
checks. Source configuration alone does not establish live deployment health.

## Supabase browser access

Browser code uses publishable keys for Auth, never server-only credentials.
Domain access goes through FastAPI. Disable the hosted Data API in both cloud
environments. Any deliberately exposed data needs explicit grants and appropriate
Row Level Security. Verify hosted configuration separately from deployment.

## Earlier deployment issues and reconciliation

Earlier issues describe superseded zip/SCP and build-on-host stages. Their
historical mapping is retained in the [deployment guide](../../docs/deployment.md#earlier-deployment-issues-and-reconciliation).
They do not override decision 0003 or establish the live rollout state.

## Acceptance criteria

- **DEP-AC-001:** After landing migration, deployment publishes to the intended organizational target and public routing serves that target correctly before the old hosting is retired.
- **DEP-AC-002:** The implemented `compose.production.yml` runs Nginx, landing, frontend, and backend without PostgreSQL or Ministack containers. The backend uses Supabase PostgreSQL's `public` schema.
- **DEP-AC-003:** When the ECR deployment from issue #23 is delivered, a workflow publishes the application image, the host runs it through the managed deployment path, the combined application stack responds, and the superseded zip/build path is removed.
- **DEP-AC-004:** In a released frontend environment, a refreshed deep link and an authentication callback return to the expected application and API paths.
- **DEP-AC-005:** Before live participant-data collection, HTTPS, restricted proof access, and the agreed pre-production verification are in place.
- **DEP-AC-006:** `/api/users/me` reaches the backend with the full path preserved, while a refresh on `/tournaments/registration` reaches the frontend. Unknown API routes are not served as SPA HTML.
- **DEP-AC-007:** The deployed application uses S3 for its files and AWS SES SMTP for application emails, with the required backend configuration.
- **DEP-AC-008:** Application HTTP redirects to HTTPS at Cloudflare. The proxied A record's origin target is the EC2 Elastic IP, and Cloudflare reaches the self-signed Nginx origin over HTTPS 443. Production Compose publishes no frontend/backend host ports.
- **DEP-AC-009:** Each production service sends container logs to its environment and service’s CloudWatch log group. Each group has indefinite retention and Terraform destruction protection.
- **DEP-AC-010:** Enabled backend monitoring reports errors and eligible traces with the correct service, environment, and artifact release. Health traces are absent. Request bodies are absent from Sentry errors and traces. Uvicorn access and server logs are absent from Sentry. With a DSN and monitoring disabled, the backend starts without sending telemetry. A missing DSN fails startup validation. Verify live delivery separately from automated checks.
- **DEP-AC-011:** Enabled browser monitoring delivers errors to the frontend and landing projects with their own service, environment, and release. The frontend sends sampled traces and masked replays. The landing site sends only errors. Verify live delivery and Replay masking separately from automated checks.

## Open questions

None about the selected stack, domains, application routing, DNS, or TLS. The remaining engineering and operational work is preserved below; it does not require repeating those product decisions.

## Implementation and operations decisions

- Verify live rollout state, IAM grants, GitHub environment protections, Session
  Manager access, networking, and hosted Supabase settings. Source configuration
  and historical issue status do not establish them.
- Define and verify failed-release recovery, database/object backup-and-restore,
  and landing account/DNS cutover and rollback procedures. Apply PRIV-011's interim
  indefinite retention. Do not retire the old hosting before cutover verification.
- Keep workflow credential policy aligned with [team access](team-access.md#implementation-and-operations-decisions)
  and decisions 0004 and 0005. Existing release checks are described in the guide.

## Related specifications

[Architecture](../architecture.md), [local development](local-development.md), [data storage](data-storage.md), [team access](team-access.md), [privacy](../tournaments/consent-and-privacy.md), [operational runbooks](../../docs/runbooks/README.md).

## Backend logging

Set `LOG_JSON=true` to write one JSON object per line to stdout. The default is console output. Records include timestamp, level, logger, and message. Exception output includes the full exception chain with messages and traceback locations. Frame locals are omitted. The renderer includes the caller’s message and structured fields provided by the caller.

The application middleware emits a request-start event and an outcome event linked by request ID. The outcome includes the route template, status, and duration. The liveness, database, and auth health routes have separate backend settings. Their defaults match the deployment probes. Health requests skip the start event. Successful health responses and trailing-slash redirects also skip the outcome event. Startup and shutdown failures emit a structured diagnostic. Responses include an `X-Request-ID` header.

Access events can include a client-provided session ID from `X-Session-ID`, the AWS trace root from `X-Amzn-Trace-Id`, the Sentry trace ID, and the verified Supabase user UUID. The active Sentry span supplies the trace ID when available. The logger also accepts a trace ID from `sentry-trace` or `x-sentry-trace`. Use a dedicated correlation ID for the session header.

Access events include the path, query string, full path, absolute URI, user agent, host, and origin when available. The separate `route` field holds the matched route template. IpWare derives `client_ip` from forwarded request headers or the ASGI peer address. Treat it as best-effort diagnostic data.

CloudWatch Logs data protection policies mask matching sensitive values in newly ingested backend logs. The backend emits the request metadata directly. Masking is configured in CloudWatch. Principals with `logs:Unmask` can retrieve the original values. A policy applies to events ingested after it is enabled. See [CloudWatch Logs data protection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html).
