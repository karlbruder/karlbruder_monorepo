# Karlbrüder frontend

**Created**: 2026-01-11
**Last updated**: 2026-11-01

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

The registration page loads Monomachia through `GET /api/tournaments` with the display name and the 2027 event-date range, then uses the returned ID for signup. An empty page shows an unavailable state. No frontend tournament ID is needed. Keep `VITE_API_BASE_URL=/api` for same-origin requests. Local Vite forwards `/api` without removing the prefix: direct Vite uses `API_PROXY_TARGET=http://localhost:8000`, while Compose sets it to `http://backend:8000`. The production application reverse proxy must preserve `/api` as well. Allow `http://localhost:5173/tournaments/registration` and the corresponding production route in Supabase Auth redirect settings so Google sign-in returns to registration.

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

[Repository setup](../README.md) · [Specifications](../specs/README.md)
