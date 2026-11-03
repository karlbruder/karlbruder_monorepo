# Operational runbooks

**Created**: 2026-10-17
**Last updated**: 2026-11-02

Runbooks describe how to operate an implemented system. Intended hosting and access requirements live in the [platform specs](../../specs/platform/deployment.md).

Local setup and verification commands are documented in the [root README](../../README.md), [backend README](../../backend/README.md), [frontend README](../../frontend/README.md), and [landing README](../../landing/README.md). Known application/configuration gaps are recorded in the [local-development spec](../../specs/platform/local-development.md).

The README review on 17 October 2026 checked these instructions against source, package scripts, environment examples, Compose, and workflow files. It did not start services, execute application tests, or verify live deployments. Deployment, backup, and recovery runbooks appear here when the corresponding path is implemented and verified.

- [Supabase auth email through SES](supabase-auth-email-ses.md): DNS, SES sandbox exit, and Supabase custom SMTP for auth mail (Terraform prod workspace).
- [Application files S3 bucket](application-files-s3-bucket.md): private upload bucket per workspace, backend secret `S3_BUCKET_NAME`, and post-apply checks.
