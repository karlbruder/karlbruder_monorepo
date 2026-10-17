# Authentication and access

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial platform identity and shared access boundaries |
| Applications | frontend, backend |
| Sources | [#18](https://github.com/karlbruder/karlbruder_monorepo/issues/18), [#3](https://github.com/karlbruder/karlbruder_monorepo/issues/3), [#9](https://github.com/karlbruder/karlbruder_monorepo/issues/9); product-owner overview |

## Goal

Identify participants reliably and restrict personal records and administrative actions to authorized users.

## Authentication rules

- **AUTH-001:** Supabase Auth owns application identity. The frontend uses the official Supabase SDK for sign-up, sign-in, session restoration, and sign-out.
- **AUTH-002:** Desired sign-in methods are email/password and Google. Email/password has separate sign-in and sign-up entry points, verification handling, and a password-recovery flow.
- **AUTH-003:** Auth callbacks restore the session and return the user to an appropriate application screen. Registration entry should retain the chosen tournament through sign-in. Exact routes and redirect configuration remain implementation decisions.
- **AUTH-004:** The frontend supplies the current Supabase access token as `Authorization: Bearer <access_token>` on protected API requests. Sign-out removes access to protected application views and stops use of the active session.
- **AUTH-005:** The backend verifies token signature, issuer, audience, expiry, required claims, and the expected authenticated role before trusting identity. It uses a FastAPI dependency on protected endpoints rather than treating every route as protected by global middleware.
- **AUTH-006:** Missing, expired, or invalid tokens return HTTP 401. Authentication-service or signing-key retrieval failures must be distinguishable from invalid credentials; the current backend uses HTTP 503 for unavailability.

## Authorization rules

- **AUTH-007:** The verified subject identifies the caller. User-editable metadata must not grant admin, membership-management, or inventory permissions.
- **AUTH-008:** Guild staff (admins) have full application access across all tournaments. No event-specific grants or additional administrative role is required. Authentication alone does not confer admin access; the backend enforces the trusted admin role and existing regular-user/member boundaries.
- **AUTH-009:** Users can access their authorized registrations and proofs. An inscription number, email address, or guessed object identifier must not bypass those checks. Authenticated callers lacking the required permission cannot obtain private data; select and document the exact 403/404 response policy in the API implementation contract.
- **AUTH-010:** AWS access through Auth0 and IAM Identity Center is a separate team system. It does not sign users into the application or assign application permissions.

The initial `/api/users/me` verification endpoint does not need a local users table. Registration ownership directly uses the existing Supabase `auth.users.id` UUID from the verified token subject. Users sign up to the application first and register only themselves; there is no separate tournament user identity or delegated registration workflow. The trusted representation of the admin role is an implementation detail and must not be user-editable.

## Acceptance criteria

- **AUTH-AC-001:** A valid Supabase token allows `/api/users/me` to return verified identity; missing, invalid, or expired tokens return 401.
- **AUTH-AC-002:** A user can complete email sign-up, configured verification, sign-in, password recovery, and sign-out when that flow is delivered.
- **AUTH-AC-003:** A user can complete Google sign-in, restore a session after redirect or refresh, and sign out.
- **AUTH-AC-004:** Changing user-editable metadata does not confer administrative access.
- **AUTH-AC-005:** A non-admin participant cannot retrieve another participant's private registration or proof by changing a request identifier.
- **AUTH-AC-006:** Verified guild staff can administer every tournament without an event-specific grant, while a signed-in user without the admin role cannot perform administrative actions.

## Implementation baseline

Source inspection on 17 October 2026 found Google sign-in/session handling in `frontend/src/App.tsx` and backend JWT verification with an ES256/RS256 allowlist and JWKS. The backend exposes `/api/users/me` and auth tests in `backend/tests/test_auth.py`. This inspection did not run those tests or verify provider configuration. Email/password and recovery screens were not present in the inspected frontend entry point despite issue #18 being marked Done.

## Open questions

None for the agreed authentication and role boundaries. The association membership relationship is owned by [MEM-Q1](../membership/overview.md#deferred-questions), not a duplicate identity question.

## Implementation decisions

Choose callback/recovery route names, session-expiry handling, and forbidden/not-found response conventions in the delivery plan. Configure callbacks for the decided application domain and existing local development ports. Preserve the selected tournament through sign-in, enforce the existing 401 contract, and store the global admin role in a trusted representation. These technical choices do not reopen self-registration, Supabase UUID ownership, or the three-role policy.

## Related specifications

[Identity decision](../decisions/0002-application-and-team-identity.md), [registration](../tournaments/registration.md), [administration](../tournaments/administration.md), [team access](../platform/team-access.md).
