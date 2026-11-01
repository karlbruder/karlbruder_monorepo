# Deployment

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Chosen production application stack, separate landing hosting, and deployment evolution |
| Applications | landing, frontend, backend, AWS, Supabase |
| Sources | Product-owner stack clarification; [decision 0003](../decisions/0003-local-and-production-stacks.md); [#11](https://github.com/karlbruder/karlbruder_monorepo/issues/11), [#12](https://github.com/karlbruder/karlbruder_monorepo/issues/12), [#25](https://github.com/karlbruder/karlbruder_monorepo/issues/25), [#13](https://github.com/karlbruder/karlbruder_monorepo/issues/13), [#23](https://github.com/karlbruder/karlbruder_monorepo/issues/23); private frontend deployment draft |

## Goal

Host the public website and application through clear, verifiable deployment paths while keeping temporary setup stages distinct from the intended later architecture.

## Shared rules

- **DEP-001:** Production infrastructure belongs in the Karlbrüder AWS account. The landing account-migration issue moves hosting away from a personal account.
- **DEP-002:** The application runs on the production host through `compose.prod.yml`, containing Nginx, frontend, and backend containers. Supabase supplies hosted Auth and PostgreSQL; domain data uses `public`. There is no PostgreSQL container in production.
- **DEP-003:** Human access, application credentials, and workflow credentials have separate responsibilities. Use authorized secret/configuration mechanisms. Never commit cloud or database credentials.
- **DEP-004:** The application origin is `app.karlbruder.com`. Nginx forwards `/api` and `/api/...` unchanged to the backend and all other application requests to the frontend container. Frontend deep links and Supabase callbacks must work through this entry point. The separate public site uses `karlbruder.com.br`.
- **DEP-005:** Cloudflare nameservers serve DNS, and a proxied A record targets the EC2 Elastic IP. Cloudflare manages public TLS and redirects HTTP 80 to HTTPS 443. The origin uses a self-signed certificate on Nginx with HTTPS 443 and Cloudflare Full mode. A test environment is required before live operation.
- **DEP-006:** A deploy verification checks the expected application release and relevant API/database behavior. Artifact publication alone does not verify deployment.
- **DEP-007:** Application file storage uses Amazon S3. Application email uses AWS SES via SMTP. Configure backend access to these services; the local Ministack emulator is not a production service.
- **DEP-008:** Only Nginx publishes a production application host port: 443. The frontend and backend communicate over the Compose network and do not publish host ports. Port 80 redirection happens at Cloudflare, preserving the HTTPS-only EC2 origin.

## Production Compose topology

The complete application stack is defined by `compose.prod.yml`:

| Component | Responsibility |
| --- | --- |
| Nginx container | HTTPS origin on published port 443 with a self-signed certificate; routes `/api` to backend and remaining requests to frontend |
| Frontend container | Serves the built application, including SPA route fallback, on an internal Compose port |
| Backend container | FastAPI domain logic, authorization, persistence, file access, and email on an internal Compose port |
| Hosted Supabase | Supabase Auth plus PostgreSQL with domain records in `public` and managed identity in `auth` |
| Amazon S3 | Restricted application files and payment proofs |
| AWS SES SMTP | Application notification delivery |
| Cloudflare | Authoritative DNS, proxied application A record to the Elastic IP, edge TLS certificate, and HTTP-to-HTTPS redirect |

Only the first three components are application Compose services. The public landing site is hosted separately. Cloudflare terminates browser TLS and opens a separate HTTPS connection to Nginx. For the specified self-signed origin certificate, use [Cloudflare Full mode](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full/) with the [edge HTTPS redirect](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/). This keeps EC2 application ingress on 443 only.

`compose.prod.yml` is in the repository. Nginx publishes 443, generates a self-signed origin certificate on first start, and keeps frontend and backend ports on the Compose network. Hosting that file on EC2, Cloudflare routing, and live verification are still separate work.

## Public website

The existing workflow builds `landing/` and synchronizes its build output to S3. Source inspection on 17 October 2026 found manual or `master` push deployment, AWS credentials through GitHub secrets, and bucket/region values through repository variables. Landing CI builds relevant PR changes. The workflow's existence does not verify the target account, DNS, or running site.

Issue #11 requires creating the target bucket in the Karlbrüder account, updating deployment configuration, moving Cloudflare routing, and retiring the old bucket after the replacement is working. The CDN/origin, deep-link fallback, and cutover verification need a concrete runbook. Issue #12 has no body, so requirements beyond its title are not reconstructed from it.

## Earlier deployment issues and reconciliation

The earlier issues describe deployment transport evolution. Their backend-only topology and older Compose filename are historical inputs superseded by decision 0003. These issue bodies have not been changed, and their deployed state has not been verified.

| Source | Earlier delivery plan | Reconciliation needed |
| --- | --- | --- |
| #25 | Initial EC2 host with zip/SCP, interactive access, and build/start on host | Deploy the selected Nginx/frontend/backend stack rather than a backend-only service; use `compose.prod.yml` |
| #13, depends on #25 | Session Manager replaces day-to-day inbound SSH; zip/build-on-host remains | Verify managed file transfer and remote execution for the combined stack |
| #23, depends on #13 | Build/push backend image to ECR; host pulls and restarts through Session Manager | Define frontend and Nginx artifact/configuration delivery alongside the backend; use the combined stack |
| Private frontend hosting draft | S3 hosting versus hosting beside the backend | Resolved in favor of the frontend container behind the application Nginx proxy |

Issue #23's intended image-deployment stage removes the zip/build-on-host path after replacement. Deployment transport, workflow identity, triggers, and migration/recovery procedures still need a concrete implementation plan. Earlier HTTP-only host setup is not the finished HTTPS application deployment. Host egress must also accommodate the chosen SES SMTP endpoint rather than blindly retaining the earlier backend-only port list.

## Acceptance criteria

- **DEP-AC-001:** After landing migration, deployment publishes to the intended organizational target and public routing serves that target correctly before the old hosting is retired.
- **DEP-AC-002:** The implemented `compose.prod.yml` runs Nginx, frontend, and backend without PostgreSQL or Ministack containers. The backend uses Supabase PostgreSQL's `public` schema.
- **DEP-AC-003:** When the ECR deployment from issue #23 is delivered, a workflow publishes the application image, the host runs it through the managed deployment path, the combined application stack responds, and the superseded zip/build path is removed.
- **DEP-AC-004:** In a released frontend environment, a refreshed deep link and an authentication callback return to the expected application and API paths.
- **DEP-AC-005:** Before live participant-data collection, HTTPS, restricted proof access, and the agreed pre-production verification are in place.
- **DEP-AC-006:** `/api/users/me` reaches the backend with the full path preserved, while a refresh on `/tournaments/registration` reaches the frontend. Unknown API routes are not served as SPA HTML.
- **DEP-AC-007:** The deployed application uses S3 for its files and AWS SES SMTP for application emails, with the required backend configuration.
- **DEP-AC-008:** Application HTTP redirects to HTTPS at Cloudflare. The proxied A record's origin target is the EC2 Elastic IP, and Cloudflare reaches the self-signed Nginx origin over HTTPS 443. Production Compose publishes no frontend/backend host ports.

## Open questions

None about the selected stack, domains, application routing, DNS, or TLS. The remaining engineering and operational work is preserved below; it does not require repeating those product decisions.

## Implementation and operations decisions

- Verify which rollout stage is actually deployed. Source inspection and historical issue status are not evidence of the live AWS configuration.
- Define workflow credentials, triggers, environment separation, artifact delivery, and production configuration in the deployment plan, following the [team-access credential policy](team-access.md#implementation-and-operations-decisions).
- Define migration execution, release verification, failed-release recovery, and database/object backup-and-restore procedures. Apply PRIV-011's interim indefinite-retention policy rather than defining another period here.
- Verify the concrete Session Manager file-transfer, remote-execution, and networking setup for the selected combined stack.
- Define and verify the landing account/DNS cutover and rollback procedure before retiring the old hosting.

## Related specifications

[Architecture](../architecture.md), [local development](local-development.md), [data storage](data-storage.md), [team access](team-access.md), [privacy](../tournaments/consent-and-privacy.md), [operational runbooks](../../docs/runbooks/README.md).
