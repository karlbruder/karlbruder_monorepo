# Decisions

**Created**: 2026-10-17
**Last updated**: 2026-11-04

Decision records preserve the reason for a significant choice. They are not implementation task lists. Record status, source, consequences, and what direction is superseded. A future proposal should not be labeled accepted before the product owner chooses it.

| Decision | Status | Subject |
| --- | --- | --- |
| [0001](0001-public-website-and-application.md) | Accepted direction | Public website and authenticated application boundaries |
| [0002](0002-application-and-team-identity.md) | Accepted direction | Supabase application identity and separate AWS team identity |
| [0003](0003-local-and-production-stacks.md) | Accepted direction | Local PostgreSQL and Ministack. Cloud Compose runs Nginx, landing, frontend, and backend with hosted Supabase PostgreSQL, Amazon S3, and SES SMTP |
| [0004](0004-shared-github-actions-role.md) | Accepted direction | One GitHub Actions role for build and deployment, with combined authority accepted for the current scale |
| [0005](0005-container-access-to-instance-role.md) | Accepted direction | Docker containers may obtain the EC2 host role through IMDSv2 so backend startup can read Secrets Manager |
| [0006](0006-frontend-application-structure.md) | Accepted direction | Feature layout for the Vite frontend, with React Router kept and helper libraries added only when a screen needs them |
| [0007](0007-clear-browser-cache-on-sign-out.md) | Accepted direction | Clear the whole browser query cache on sign-out. HTTP 401 signs the user out. HTTP 403 does not |
| [0008](0008-shared-files-and-archives.md) | Accepted direction | Shared StoredFile and ArchivedFile in core files, with domain-owned purpose, access and version selection |
| [0009](0009-shared-payments-and-domain-associations.md) | Accepted direction | Shared Payment and Refund facts, with tournament and future consumer associations owned by their domains |
| [0010](0010-database-evidence-guards.md) | Implemented choice | PostgreSQL trigger functions protect retained evidence and cross-record financial relationships, with explicit costs and limits |

Production topology is defined by decision 0003. Earlier deployment transport stages remain planning inputs in the [deployment spec](../platform/deployment.md); they do not override the chosen application stack.
