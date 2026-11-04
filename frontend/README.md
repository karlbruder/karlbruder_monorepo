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

Allow your development origin in the project's authentication redirect settings and configure its Google provider. Use only a publishable key beginning with `sb_publishable_`; `VITE_*` values are included in the browser bundle.

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

Turn on the email provider and email confirmation in the Supabase dashboard for each project you use. Customize Supabase Auth email templates in Portuguese for each message type the project sends (sign-up confirmation, password recovery, and other Auth-managed types). See AUTH-011 in [authentication and access](../specs/identity/authentication-and-access.md). The application UI may stay bilingual. Auth email stays Portuguese until a later issue adds multi-language templates.

### Auth email through SES (Supabase custom SMTP)

Point Supabase **custom SMTP** at AWS SES for each hosted project. Use a **From** address that SES has verified and will send for. SMTP usernames, passwords, and other mail credentials belong only in the Supabase dashboard or your secret store. Do not put them in frontend code, `VITE_*` variables, this README, or `.env.example`. The browser uses the publishable key only. Supabase sends confirmation and recovery mail through SES using those Portuguese templates.

For DNS in Cloudflare, SES sandbox exit, Terraform outputs, and the Supabase SMTP form, follow [Supabase auth email through SES](../docs/runbooks/supabase-auth-email-ses.md).

The registration page loads Monomachia through `GET /api/tournaments` with the display name and the 2027 event-date range, then uses the returned ID for registration. An empty page shows an unavailable state. No frontend tournament ID is needed. Keep `VITE_API_BASE_URL=/api` for same-origin requests. Local Vite forwards `/api` without removing the prefix: direct Vite uses `API_PROXY_TARGET=http://localhost:8000`, while Compose sets it to `http://backend:8000`. The production application reverse proxy must preserve `/api` as well.

Tournament registration uses `POST /api/tournaments/{tournament_id}/registrations`.
Individual resources use `registration_number`. Parental document routes use
`parental-consent-form`. The backend provides declaration content and acceptance
tokens for each interface language, plus preserved-policy download links.
Changed terms require explicit acceptance again while retaining personal fields.
Owner payment instructions and latest-proof access keep their existing restrictions.
See the [tournament API guide](../backend/app/tournaments/README.md).

Vite reads this directory's environment file. Local Compose loads the same file and sets `API_PROXY_TARGET` to `http://backend:8000` so the container can reach the backend service. Restart the development server after changing the file. The required build variables are `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `VITE_API_BASE_URL` is optional and defaults to `/api`. Vite validates the required values for both `npm run build` and Docker builds, and reports missing names without printing values. The production image build takes `VITE_SUPABASE_URL` as a build argument and `VITE_SUPABASE_PUBLISHABLE_KEY` through a BuildKit secret mount. The build rejects missing values, legacy JWT keys, and server-only secret keys. The deploy workflow reads `VITE_SUPABASE_URL` from the GitHub variable of that name and `VITE_SUPABASE_PUBLISHABLE_KEY` from the secret of that name, for the selected `dev` or `prod` environment.

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

Frontend tests do not need `compose.test.yml`. From the repository root, run `make test-frontend`. That uses the local development image.

## Development

Run from `frontend/`:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`.

For container-based development and shared service configuration, follow the [root setup](../README.md#local-setup-with-docker-compose). Integration limitations are maintained in the [local-development specification](../specs/platform/local-development.md#observed-configuration-and-gaps).

## Build and checks

From `frontend/`:

```sh
npm run lint
npm run build
npm run preview
```

The build runs TypeScript checks and generates static assets in `dist/`. Preview serves that build locally; it is not a production deployment server.

## Further reading

[Repository setup](../README.md) · [Specifications](../specs/README.md) · [Frontend structure](../specs/decisions/0006-frontend-application-structure.md)
