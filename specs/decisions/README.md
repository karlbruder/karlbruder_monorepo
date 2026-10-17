# Decisions

Decision records preserve the reason for a significant choice. They are not implementation task lists. Record status, source, consequences, and what direction is superseded. A future proposal should not be labeled accepted before the product owner chooses it.

| Decision | Status | Subject |
| --- | --- | --- |
| [0001](0001-public-website-and-application.md) | Accepted direction | Public website and authenticated application boundaries |
| [0002](0002-application-and-team-identity.md) | Accepted direction | Supabase application identity and separate AWS team identity |
| [0003](0003-local-and-production-stacks.md) | Accepted direction | Local Docker PostgreSQL; production Nginx/frontend/backend Compose with Supabase PostgreSQL; S3/Ministack storage and SES SMTP |

Production topology is defined by decision 0003. Earlier deployment transport stages remain planning inputs in the [deployment spec](../platform/deployment.md); they do not override the chosen application stack.
