
Requires #18.

We want to identify who is calling the API, for security and tracking.

Authentication lives in Supabase Auth. The frontend sends the Supabase access_token (JWT) on each API call. The backend must verify that JWT and read the user identity from its claims.

In FastAPI we do this with a dependency (for example get_current_user), not global HTTP middleware. A dependency still runs before the route body, so it feels like middleware, but you attach it only to the endpoints that need auth.

We do not need a local users table or ORM user model for this ticket. Supabase already owns the user record. The backend only validates the Bearer token and reads identity from the verified JWT (for example sub, email, user_metadata, app_metadata).

Constraints:

    Prefer a FastAPI auth dependency over app-wide HTTP middleware.
    Prefer verifying with JWKS or supabase.auth.get_claims(jwt). Do not invent a custom auth server.
    Do not create or look up a user row in our database in this ticket.

Tasks:

    Following official FastAPI docs for Bearer / JWT-style dependencies, build a simplified auth dependency. Supabase already issues the token.
        Create a get_current_user dependency that reads Authorization: Bearer <access_token>
        Verify the JWT with Supabase’s recommended approach (prefer asymmetric keys + JWKS, or supabase.auth.get_claims(jwt) from supabase-py)
        Reject missing, invalid, or expired tokens with HTTP 401
        Return a simple user object from JWT claims (at least id from sub, plus useful fields like email and metadata). Do not create or look up a user row in our database
    Add GET /api/users/me that requires an authenticated user and returns that user data as JSON
    Document the required backend env vars (Supabase project URL, publishable key, or whatever the chosen verification path needs) and how the frontend should send the token

Resources:

    Supabase JWTs
    JWT Claims Reference
    JWT Signing Keys
    Python: get_claims
    Python: get_user
    FastAPI Security - OAuth2 with Password (and JWT)

Walkthrough:

    Frontend signs the user in with Supabase Auth and gets a short-lived access_token from the session.
    Frontend calls the backend with Authorization: Bearer <access_token>.
    Backend get_current_user reads the Bearer token and verifies it.
    Preferred path: verify against the project JWKS at GET https://<project-id>.supabase.co/auth/v1/.well-known/jwks.json, or call supabase.auth.get_claims(jwt), which does that for you. Check standard claims as needed (exp, iss, aud).
    If the project still uses a legacy HS256 shared secret, prefer validating via Supabase Auth (GET /auth/v1/user with the Bearer token) instead of verifying the shared secret in app code. Supabase discourages local shared-secret verification.
    From the verified claims, build the current user. Identity is sub. Extra profile data can come from email, user_metadata, and app_metadata.
    GET /api/users/me returns that JSON so we can smoke-test auth end to end.

Acceptance check: with a valid Supabase access token, GET /api/users/me returns the signed-in user’s identity. Without a token, or with an invalid token, it returns 401.