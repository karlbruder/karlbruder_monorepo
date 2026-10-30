# Karlbrüder frontend

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
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_CLIENT_KEY
VITE_API_BASE_URL=/api
```

Allow your development origin in the project's authentication redirect settings and configure its Google provider. Use only a public client key; `VITE_*` values are included in the browser bundle.

The registration page loads the event through `GET /api/tournaments?slug=monomachia-2027` and uses the returned ID for signup. Assign that stable slug to the verified Monomachia event first, following the [backend migration notes](../backend/docs/migrations.md#assigning-a-slug-to-an-existing-event); an empty result shows an unavailable state. No frontend tournament ID is needed. Keep `VITE_API_BASE_URL=/api` for same-origin requests. Local Vite forwards `/api` without removing the prefix: direct Vite uses `API_PROXY_TARGET=http://localhost:8000`, while Compose sets it to `http://backend:8000`. The production application reverse proxy must preserve `/api` as well. Allow `http://localhost:5173/tournaments/registration` and the corresponding production route in Supabase Auth redirect settings so Google sign-in returns to registration.

Vite reads this directory's environment file, independently of the root `.env`. Restart the development server after changing it. Production values must be supplied when building the bundle.

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
