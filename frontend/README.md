# Karlbrüder frontend

**Created**: 2026-01-11
**Last updated**: 2026-11-04

React and TypeScript application built with Vite. This is the user-facing frontend of the Karlbrüder platform.

## Requirements

Install Node.js and npm compatible with the checked-in lockfile. On the Node 20 release line used by the Dockerfile, the locked tooling requires version 20.19 or later.

## Configuration

From `frontend/`:

```sh
cp .env.example .env
```

Fill in the values for your Supabase project:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
VITE_API_BASE_URL=/api
```

Allow your development origin in the project's authentication redirect settings and configure its Google provider. Use only a publishable key beginning with `sb_publishable_`. `VITE_*` values are included in the browser bundle.

### Account routes and Supabase redirect URLs

Email sign-up, sign-in, confirmation, recovery, and signed-in password change use these application paths:

| Path | Use |
| --- | --- |
| `/account/sign-in` | Email sign-in and return target after email confirmation |
| `/account/sign-up` | Email sign-up |
| `/account/check-email` | Check your email after sign-up |
| `/account/recover` | Request a password recovery link |
| `/account/new-password` | Set a new password from a recovery link |
| `/account/password` | Change password while already signed in |

In each Supabase project that matches your local `VITE_SUPABASE_URL` and the `dev` and `prod` deployment variables, allow these redirect URLs:

- `http://localhost:5173/account/sign-in`
- `http://localhost:5173/account/new-password`
- `http://localhost:5173/tournaments/registration`
- `https://app-dev.karlbruder.com/account/sign-in`
- `https://app-dev.karlbruder.com/account/new-password`
- `https://app-dev.karlbruder.com/tournaments/registration`
- `https://app.karlbruder.com/account/sign-in`
- `https://app.karlbruder.com/account/new-password`
- `https://app.karlbruder.com/tournaments/registration`
- `https://app-prod.karlbruder.com/account/sign-in`
- `https://app-prod.karlbruder.com/account/new-password`
- `https://app-prod.karlbruder.com/tournaments/registration`

Keep the existing Google redirect for `/tournaments/registration` on each origin above. Email sign-up uses confirmation with `emailRedirectTo` pointing at `/account/sign-in`. Recovery uses `redirectTo` pointing at `/account/new-password`, optionally with a validated `returnTo` query parameter when recovery started from a deep link. If a hosted project is shared between environments, configure the allow-list once.

Enable the email provider and confirmation in each Supabase project. Configure Portuguese templates for every enabled Auth message type under [AUTH-011](../specs/identity/authentication-and-access.md#authentication-rules). Auth email remains Portuguese even when the interface is English.

### Auth email through SES (Supabase custom SMTP)

Configure Supabase custom SMTP with SES and an SES-verified From address using the
[auth email runbook](../docs/runbooks/supabase-auth-email-ses.md). Keep SMTP credentials
in the Supabase dashboard or secret store, never in frontend code, `VITE_*`,
READMEs, or env examples. The browser uses only the publishable key.

### Tournament requests

The registration page finds Monomachia through `GET /api/tournaments`, filtered by display name and the 2027 event-date range. It uses the returned ID or shows an unavailable state when no event matches. No frontend tournament ID is configured.

Keep `VITE_API_BASE_URL=/api`. Local Vite preserves `/api` when forwarding to `API_PROXY_TARGET`, which defaults to `http://localhost:8000`. Compose sets it to `http://backend:8000`. Production's separate Nginx service sends `/api` directly to the backend with the same prefix.

Follow the [tournament API guide](../backend/app/tournaments/README.md) for registration,
parental-consent-form and proof routes, acceptance tokens, and access restrictions.
The backend supplies declarations in each interface language and preserved-policy
links. Changed terms require explicit acceptance again while retaining personal fields.

### Build configuration

Vite and local Compose read this directory's environment file. Restart Vite after
changing it. Builds require `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
`VITE_API_BASE_URL` defaults to `/api`. Validation reports missing names without
printing values and rejects legacy JWT or server-only keys.

The production image takes the project URL as a build argument and the publishable
key through a BuildKit secret mount. The deploy workflow reads the matching GitHub
variable and secret for the selected `dev` or `prod` environment.

For existing setups, replace `VITE_SUPABASE_ANON_KEY` in your local `.env` with `VITE_SUPABASE_PUBLISHABLE_KEY` and a new publishable key from Supabase. Set the new secret name in both GitHub environments before deploying. Renaming the old key does not migrate it.

For a production Docker build, export the publishable key in your shell and run:

```sh
docker build --target production --no-cache-filter builder \
  --build-arg VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co \
  --secret id=VITE_SUPABASE_PUBLISHABLE_KEY,env=VITE_SUPABASE_PUBLISHABLE_KEY .
```

The pipeline rebuilds the frontend builder stage because changes to mounted secrets do not invalidate Docker's cache. The mount avoids passing the key through Docker arguments. Vite still includes this public key in the browser bundle.

Supabase supplies Auth only to the browser. Domain requests go through FastAPI. Disable the hosted Data API in both cloud environments and review existing and default grants on domain tables. A publishable key does not replace database access controls. Keep legacy keys active until any remaining consumers have migrated, then disable them separately.

The production image stores `GIT_SHA` and `RELEASED_AT` as container environment variables. The pipeline supplies the commit and a UTC build timestamp. These describe the image build and do not change when the container restarts. They are not browser runtime configuration.

## Development

Run from `frontend/`:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`.

For container-based development and shared service configuration, follow the [root setup](../README.md#local-setup-with-docker-compose). Integration limitations are maintained in the [local-development specification](../specs/platform/local-development.md#observed-configuration-and-gaps).

## Build and checks

Run `make test-frontend` from the repository root. It uses the local development
image, without `compose.test.yml`.

From `frontend/`:

```sh
npm run lint
npm run build
npm run preview
```

The build runs TypeScript checks and generates static assets in `dist/`. Preview serves that build locally. It is not a production deployment server.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md) · [Frontend structure](../specs/decisions/0006-frontend-application-structure.md)
