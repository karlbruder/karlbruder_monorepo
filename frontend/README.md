# Karlbrüder frontend

**Created**: 2026-01-11
**Last updated**: 2026-11-04

React and TypeScript application built with Vite. Supabase owns authentication.
FastAPI owns domain rules and data. The public website lives in `landing/`.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/main.tsx` | Browser entry point and `BrowserRouter` |
| `src/app/provider.tsx` | Query, auth-session, and language provider composition |
| `src/app/router.tsx` | URL-to-route mapping |
| `src/app/routes/` | Screens, navigation, and feature composition |
| `src/features/` | Auth, tournament registration/payment proofs, and diagnostics |
| `src/lib/` | Supabase, Query, and request helpers |

[AGENTS.md](AGENTS.md) owns the full layout, dependency, and editing rules.

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

Use a publishable key beginning with `sb_publishable_`. All `VITE_*` values enter the browser bundle.

### Account routes and Supabase redirect URLs

| Path | Use |
| --- | --- |
| `/account/sign-in` | Email sign-in and return target after email confirmation |
| `/account/sign-up` | Email sign-up |
| `/account/check-email` | Check your email after sign-up |
| `/account/recover` | Request a password recovery link |
| `/account/new-password` | Set a new password from a recovery link |
| `/account/password` | Change password while already signed in |

Allow these three redirect paths on every applicable origin:
`/account/sign-in`, `/account/new-password`, and `/tournaments/registration`.

| Environment | Origins |
| --- | --- |
| Local | `http://localhost:5173` |
| Dev | `https://app-dev.karlbruder.com` |
| Prod | `https://app.karlbruder.com`, `https://app-prod.karlbruder.com` |

Use the Supabase project matching that environment's `VITE_SUPABASE_URL`.
Configure shared projects once. Keep the Google redirect to
`/tournaments/registration`. Email confirmation uses `emailRedirectTo` with
`/account/sign-in`. Recovery uses `redirectTo` with `/account/new-password`,
optionally carrying a validated `returnTo` for a deep link.

Enable the email provider and confirmation in each Supabase project. Configure Portuguese templates for every enabled Auth message type under [AUTH-011](../specs/identity/authentication-and-access.md#authentication-rules). Auth email remains Portuguese even when the interface is English.

### Auth email through SES (Supabase custom SMTP)

Follow the [auth email runbook](../docs/runbooks/supabase-auth-email-ses.md) for
Supabase custom SMTP through SES. Keep SMTP credentials in the dashboard or secret
store, never in frontend code, `VITE_*`, READMEs, or env examples.

### Tournament requests

The registration page finds Monomachia through `GET /api/tournaments`, filtered by name and the 2027 date range. It requires one matching event and uses its returned ID. No match shows an unavailable state. Multiple matches are an error. No tournament ID is configured in the frontend.

Keep `VITE_API_BASE_URL=/api`.

| Stack | API forwarding |
| --- | --- |
| Host development | Vite to `API_PROXY_TARGET`, default `http://localhost:8000` |
| Local Compose | Vite to `http://backend:8000`. No Nginx service |
| Production Compose | Separate Nginx service to the backend. The frontend image's Nginx serves static assets |

All three preserve `/api`. Domain requests use `src/lib/api-fetch.ts` and feature
API modules. Private uploads send bytes directly to a backend-issued presigned URL.

Follow the [tournament API guide](../backend/app/tournaments/README.md) for registration,
parental-consent-form and proof routes, acceptance tokens, and access restrictions.
The backend supplies declarations in each interface language and preserved-policy
links. Changed terms require explicit acceptance again while retaining personal fields.

### Build configuration

Vite and local Compose read this directory's environment file. Restart Vite after
changing it. Builds require `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
`VITE_API_BASE_URL` defaults to `/api`. Validation reports missing names without
printing values and rejects legacy JWT or server-only keys.

Production builds take the project URL as an argument and the publishable key
through a BuildKit secret. Deployment reads the matching GitHub variable and secret
for `dev` or `prod`.

Legacy setups must replace `VITE_SUPABASE_ANON_KEY` with
`VITE_SUPABASE_PUBLISHABLE_KEY` locally and in both GitHub environments. Use a new
publishable key from Supabase. Renaming the old value is insufficient.

For a production Docker build, export the publishable key in your shell and run:

```sh
docker build --target production --no-cache-filter builder \
  --build-arg VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co \
  --secret id=VITE_SUPABASE_PUBLISHABLE_KEY,env=VITE_SUPABASE_PUBLISHABLE_KEY .
```

The pipeline rebuilds the builder stage because secret changes do not invalidate the build cache. Vite includes the publishable key in the browser bundle.

Use Supabase Auth only, with domain requests through FastAPI. Disable the hosted Data API in both cloud environments and review existing and default grants on domain tables. Retire legacy keys only after their remaining consumers migrate.

`GIT_SHA` and `RELEASED_AT` describe the production image build. They are container metadata, not browser runtime configuration.

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


## Staff payment review

Admins can open payment review from the home screen or `/staff/payment-reviews`.
The queue covers all tournaments and supports exact registration-number search.
Each review shows evidence history, document links, eligibility, and capacity.
Staff supplies the received amount for approval or a reason for rejection.
A saved result distinguishes confirmation from paid waitlist and email failure.

A stale proof or competing decision requires refreshing and inspecting evidence
again. Draft amount and rejection text are retained. Backend authorization and
capacity checks apply to every decision. The interface offers Portuguese and English.
See the [administration specification](../specs/tournaments/administration.md#staff-payment-review-screens).
