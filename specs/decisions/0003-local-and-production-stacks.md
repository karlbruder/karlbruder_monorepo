# 0003: Local and production stacks

**Created**: 2026-10-17
**Last updated**: 2026-11-01

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Sources | Product-owner architecture clarification and confirmation of Ministack |

## Context

Earlier issues proposed backend-only EC2 deployment and left private frontend hosting undecided. The owner has now chosen a production Compose stack for the combined application and identified the storage and email services.

## Decision

- Development and production are modes. `dev` and `prod` are cloud environments.
- Local development mode uses `compose.yml`, hosted Supabase Auth, and a Docker PostgreSQL domain database with application tables in `public`.
- Both cloud environments use production mode through `compose.production.yml`. That file runs Nginx, landing, frontend, and backend on one host. Hosted Supabase provides Auth and PostgreSQL. The backend reads and writes domain data in `public`. There is no PostgreSQL container in production mode.
- A push to `master` deploys the `dev` environment. The `prod` environment deploys only from a manual workflow run.
- Nginx routes a landing hostname to the landing container. On an application hostname it routes `/api` and `/api/...` to the backend and other requests to the frontend. The backend receives the `/api` prefix unchanged.
- Cloudflare nameservers provide DNS. The landing and application names for an environment are proxied A records targeting that environment's EC2 Elastic IP. Cloudflare manages public certificates, terminates browser TLS, and redirects HTTP 80 to HTTPS 443 at the edge. It connects to the Nginx origin over HTTPS 443 using the instance's self-signed certificate and Full encryption mode.
- Only Nginx publishes a production application host port, 443. Frontend/backend ports remain internal to Compose. The edge redirect keeps EC2 application ingress HTTPS-only.
- Private file storage uses Amazon S3 in production and Ministack S3 emulation locally when the storage capability is implemented.
- Application email uses AWS SES through SMTP. Local SMTP setup is deferred, likely real SES with real AWS/SES credentials. Existing default local ports are retained rather than requiring another product decision.
- The public landing site remains a separate application. It runs as its own container in this Compose project, and Nginx selects it by hostname.

## Consequences

The private frontend hosting draft is resolved. Backend-only topology and the `compose.prod.yaml` filename in earlier issues are superseded by `compose.production.yml`. GitHub issues have not been edited by this decision record.

The earlier SCP, Session Manager, and ECR issues can still inform deployment transport and artifact delivery. They must be reconciled with this topology before implementation rather than treated as instructions to omit the frontend or Nginx.

The repository defines `compose.production.yml` and the deploy workflow. A push to `master` deploys `dev`. A manual run can deploy `dev` or `prod`. The workflow builds the images whose paths changed, pushes them to ECR, and replaces those containers through Session Manager. Nginx writes its hostnames when it starts, and it creates a self-signed origin certificate on first start. A live Cloudflare, EC2, and HTTPS check is still separate work. S3 file storage and SES email are still separate application work. Local SMTP remains deferred.

## References

[Architecture](../architecture.md), [deployment](../platform/deployment.md), [local development](../platform/local-development.md), [data storage](../platform/data-storage.md), [Ministack official repository](https://github.com/ministackorg/ministack).
