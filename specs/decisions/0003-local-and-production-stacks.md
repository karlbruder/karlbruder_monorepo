# 0003: Local and production stacks

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Sources | Product-owner architecture clarification and confirmation of Ministack |

## Context

Earlier issues proposed backend-only EC2 deployment and left private frontend hosting undecided. The owner has now chosen a production Compose stack for the combined application and identified the storage and email services.

## Decision

- Local development uses hosted Supabase Auth and a Docker PostgreSQL domain database with application tables in `public`.
- Production uses `compose.prod.yml` with Nginx, frontend, and backend containers. Hosted Supabase provides Auth and PostgreSQL. The backend reads/writes its domain data in `public`; there is no production PostgreSQL container.
- Nginx routes application-origin `/api` and `/api/...` requests to the backend and other requests to the frontend. The backend receives the `/api` prefix unchanged.
- Cloudflare nameservers provide DNS, with a proxied application A record targeting the EC2 static Elastic IP. Cloudflare manages public certificates, terminates browser TLS, and redirects HTTP 80 to HTTPS 443 at the edge. It connects to the Nginx origin over HTTPS 443 using the instance's self-signed certificate and Full encryption mode.
- Only Nginx publishes a production application host port, 443. Frontend/backend ports remain internal to Compose. The edge redirect keeps EC2 application ingress HTTPS-only.
- Private file storage uses Amazon S3 in production and Ministack S3 emulation locally when the storage capability is implemented.
- Application email uses AWS SES through SMTP. Local SMTP setup is deferred, likely real SES with real AWS/SES credentials. Existing default local ports are retained rather than requiring another product decision.
- The public landing site remains a separate application from this production Compose stack.

## Consequences

The private frontend hosting draft is resolved. Backend-only topology and the `compose.prod.yaml` filename in earlier issues are superseded by the chosen combined stack and `compose.prod.yml` filename. GitHub issues have not been edited by this decision record.

The earlier SCP, Session Manager, and ECR issues can still inform deployment transport and artifact delivery. They must be reconciled with this topology before implementation rather than treated as instructions to omit the frontend or Nginx.

The current checkout does not yet implement the complete production stack or storage/email integrations. Cloudflare/EC2 DNS and TLS are now decided architecture. Deployment mechanics and certificate provisioning still need implementation, and local SMTP configuration remains deliberately deferred.

## References

[Architecture](../architecture.md), [deployment](../platform/deployment.md), [local development](../platform/local-development.md), [data storage](../platform/data-storage.md), [Ministack official repository](https://github.com/ministackorg/ministack).
