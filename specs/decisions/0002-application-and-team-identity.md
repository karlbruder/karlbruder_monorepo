# 0002: Application and team identity

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Recorded | 17 October 2026 |
| Sources | [#18](https://github.com/karlbruder/karlbruder_monorepo/issues/18), [#3](https://github.com/karlbruder/karlbruder_monorepo/issues/3), [#9](https://github.com/karlbruder/karlbruder_monorepo/issues/9), [#19](https://github.com/karlbruder/karlbruder_monorepo/issues/19) |

## Context

The tutorial originally used Cognito. Later issues replace it with Supabase Auth. Separately, the team needs AWS access through Auth0 and IAM Identity Center. These systems serve different users and grant different kinds of access.

## Decision

Supabase Auth owns application identity. The frontend uses its SDK for sessions, and the backend verifies Supabase access tokens. Cognito is historical direction and must not be reintroduced from the tutorial issue.

The owner's subsequent access clarification grants guild staff (admins) full application access across all tournaments. There are no event-specific admin assignments. The backend must use a trusted admin role representation; its storage is an implementation detail.

AWS team identity follows Google/Gmail through Auth0 to IAM Identity Center. That operational identity does not replace Supabase application identity or grant application admin permissions.

## Consequences

- Token verification and application authorization remain separate checks.
- The `auth` schema remains Supabase-managed. Domain records use `public`.
- The initial identity-verification endpoint does not require a local users table. Later domain ownership may reference Supabase subjects without duplicating the authentication system.
- Email/password and Google flows are desired capabilities; an issue marked Done does not verify that each flow is present in this checkout.
- Issue #3's references to #19 as shared frontend session work are stale. Issue #18 is the frontend Supabase source; #19 now concerns AWS access.
