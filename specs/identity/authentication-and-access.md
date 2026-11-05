# Authentication and access

**Created**: 2026-10-17
**Last updated**: 2026-11-05

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
- **AUTH-002:** Desired sign-in methods are email/password and Google. Email/password has separate sign-in and sign-up entry points, verification handling, and a password-recovery flow. A signed-in person can change the password on `/account/password` by entering the new password twice and submitting when both values match. The client calls Supabase `updateUser` with the new password. On success the active session stays signed in. On failure the client shows the Supabase error and the previous password remains in effect.
- **AUTH-003:** Auth callbacks restore the session and return the user to an appropriate application screen. Registration entry should retain the chosen tournament through sign-in. The application uses these account routes: `/account/sign-in`, `/account/sign-up`, `/account/check-email`, `/account/recover`, `/account/new-password`, and `/account/password` for a signed-in password change. Email sign-up confirms through the configured Supabase Auth template and returns the person to sign-in. Recovery opens `/account/new-password` when the link establishes a session. Redirect URLs must be allowed on each hosted Supabase project the app uses.
- **AUTH-011:** Supabase Auth email templates use Portuguese only. That covers sign-up confirmation, password recovery, and other Auth-managed message types configured in the Supabase project, including security notifications when they are enabled. The application UI may offer English. Auth email language does not follow the UI language toggle until multi-language Auth email is delivered under the implementation decision below. Backend application mail stays Portuguese under [COM-008](../tournaments/communications.md#rules).
- **AUTH-012:** The application must not show raw Supabase Auth API `error.message` text in the UI. Map `error.code` values from the [Supabase Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes) to Portuguese and English copy in the frontend. Supabase remains the source of truth for password strength. The client does not reimplement that policy.
- **AUTH-004:** The frontend supplies the current Supabase access token as `Authorization: Bearer <access_token>` on protected API requests. Sign-out removes access to protected application views, stops use of the active session, and clears the browser query cache. See [decision 0007](../decisions/0007-clear-browser-cache-on-sign-out.md). An API response of HTTP 401 signs the current user out. HTTP 403 leaves the session in place.
- **AUTH-005:** The backend verifies token signature, issuer, audience, expiry, required claims, and the expected authenticated role before trusting identity. It uses a FastAPI dependency on protected endpoints rather than treating every route as protected by global middleware.
- **AUTH-006:** Missing, expired, or invalid tokens return HTTP 401. Authentication-service or signing-key retrieval failures must be distinguishable from invalid credentials; the current backend uses HTTP 503 for unavailability.

## Authorization rules

- **AUTH-007:** The verified subject identifies the caller. User-editable metadata must not grant admin, membership-management, or inventory permissions.
- **AUTH-008:** Guild staff (admins) have full application access across all tournaments. No event-specific grants or additional administrative role is required. Authentication alone does not confer admin access; the backend enforces the trusted admin role and existing regular-user/member boundaries.
- **AUTH-009:** Users can access their authorized registrations and proofs. A registration number, email address, or guessed object identifier must not bypass those checks. Authenticated callers lacking the required permission cannot obtain private data; select and document the exact 403/404 response policy in the API implementation contract.
- **AUTH-010:** AWS access through Auth0 and IAM Identity Center is a separate team system. It does not sign users into the application or assign application permissions.

The initial `/api/users/me` verification endpoint does not need a local users table. Registration ownership directly uses the existing Supabase `auth.users.id` UUID from the verified token subject. Users sign up to the application first and register only themselves; there is no separate tournament user identity or delegated registration workflow. The trusted representation of the admin role is an implementation detail and must not be user-editable.

## Acceptance criteria

- **AUTH-AC-001:** A valid Supabase token allows `/api/users/me` to return verified identity; missing, invalid, or expired tokens return 401.
- **AUTH-AC-002:** A user can complete email sign-up, configured verification, sign-in, password recovery, signed-in password change on `/account/password`, and sign-out when that flow is delivered.
- **AUTH-AC-003:** A user can complete Google sign-in, restore a session after redirect or refresh, and sign out.
- **AUTH-AC-004:** Changing user-editable metadata does not confer administrative access.
- **AUTH-AC-005:** A non-admin participant cannot retrieve another participant's private registration or proof by changing a request identifier.
- **AUTH-AC-006:** Verified guild staff can administer every tournament without an event-specific grant, while a signed-in user without the admin role cannot perform administrative actions.
- **AUTH-AC-007:** Configured Supabase Auth emails for sign-up confirmation, password recovery, and enabled security notifications are sent in Portuguese.
- **AUTH-AC-008:** Signing out clears cached application data. An API response of HTTP 401 signs the current user out. An HTTP 403 response does not.

## Implementation baseline

Source inspection on 4 November 2026 found Google and email/password authentication, session restoration, sign-out, and account recovery/password routes under `frontend/src/features/auth/` and `frontend/src/app/`. Supabase calls retain provider names such as `signUp`. The backend verifies JWTs in `backend/app/auth/supabase/tokens.py` using an ES256/RS256 allowlist and JWKS, and exposes `/api/users/me`. It reads the application role from verified `app_metadata.karlbruder_role`.

The staff account API requires a verified admin token for both operations. `GET /api/staff/users` returns only account IDs, emails and effective roles. Missing or unrecognized roles resolve to `regular_user`. Pass a one-based `page` and a `per_page` from 1 to 100. Defaults are page 1 and 50 accounts. Follow `next_page` until it is null to cover the directory when filtering in the staff panel.

`PATCH /api/staff/users/{user_id}` accepts only a `role` field with `regular_user`, `guild_member`, or `admin`. Invalid requests return 422, unknown accounts return 404, and unavailable provider operations return 503. The backend sends only `app_metadata.karlbruder_role` to the [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid), which merges the supplied key into existing metadata. Concurrent external writes still depend on Supabase's update behavior. Successful promotions to admin log the actor and target IDs.

Guild staff can demote themselves or the last admin. An authorized Supabase operator can restore admin access through Auth-managed app metadata. Role changes reach existing sessions on token refresh or expiry. The privileged key stays on the backend. The staff screen is a separate implementation checkpoint.

The 17 October inspection found only Google sign-in in the old frontend entry point despite issue #18 being marked Done. That historical observation no longer describes the current account screens. Neither inspection establishes hosted provider configuration or live email delivery.

## Open questions

None for the agreed authentication and role boundaries. The association membership relationship is owned by [MEM-Q1](../membership/overview.md#deferred-questions), not a duplicate identity question.

## Implementation decisions

Account routes and session-expiry behavior are defined by AUTH-003 and AUTH-004. Use the [frontend configuration guide](../../frontend/README.md#account-routes-and-supabase-redirect-urls) for hosted redirect setup and the [tournament API guide](../../backend/app/tournaments/README.md) for current resource-access responses. Future workflows must preserve the selected tournament through sign-in, the existing 401 contract, and trusted role checks. Self-registration, Supabase UUID ownership, and the three-role policy remain requirements.

Role changes do not immediately change claims in already-issued access tokens. A demoted admin's existing token can retain admin access until it expires or is refreshed. The owner accepts this delay for now because access tokens are short-lived. Immediate revocation and a live role check on each privileged API call are not current requirements. The actual token lifetime is configured in Supabase and has not been verified here.

When the product adds multi-language Auth email, keep one Supabase template per message type. Branch inside each template with Supabase Go template conditionals on `user_metadata` exposed as `{{ .Data.* }}`, as in [Customizing emails by language](https://supabase.com/docs/guides/troubleshooting/customizing-emails-by-language-KZ_38Q). Persist the person's language preference in `user_metadata` on sign-up and when they change language in the app. Do not adopt a separate Send Email Hook for Auth mail unless a later decision requires it.

## Related specifications

[Identity decision](../decisions/0002-application-and-team-identity.md), [registration](../tournaments/registration.md), [administration](../tournaments/administration.md), [team access](../platform/team-access.md).
