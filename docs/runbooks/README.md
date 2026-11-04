# Operational runbooks

**Created**: 2026-10-17
**Last updated**: 2026-11-04

Runbooks describe how to operate an implemented system. Intended hosting and access requirements live in the [platform specs](../../specs/platform/deployment.md).

Use the [documentation index](../README.md) for local setup, migrations, team
sign-in, and deployment mechanics. Open only the runbook needed for the operation.
These procedures do not establish that live configuration has been applied or
verified. Recovery and cutover procedures are added when their path is defined
and verified.

- [Supabase auth email through SES](supabase-auth-email-ses.md): DNS, SES sandbox exit, and Supabase custom SMTP for auth mail (Terraform prod workspace).
- [Application files S3 bucket](application-files-s3-bucket.md): private upload bucket per workspace, backend secret `S3_BUCKET_NAME`, and post-apply checks.
- [GitHub Actions access](github-actions-access.md): account OIDC provider, shared deployment role, IAM policies, and access verification.

Historical verification boundary: the 17 October 2026 README review checked source,
package scripts, environment examples, Compose, and workflows. It did not start
services, run application tests, or verify live deployments.
