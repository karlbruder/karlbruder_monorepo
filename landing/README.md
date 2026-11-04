# Karlbrüder public website

**Created**: 2026-10-17
**Last updated**: 2026-11-04

Public React website for `karlbruder.com`, built with Create React App
(`react-scripts`). It introduces the group and presents Monomachia. Sign-in and
tournament registration belong in the [application](../frontend/README.md).
Public pages do not fetch event facts from the backend.

## Pages and content

| Route | Content |
| --- | --- |
| `/` | Group, training, weapons, gallery, partners, and contact |
| `/monomachia` | Event, Portuguese/English selection, sponsors, Instagram, and registration link |
| Other paths | Client-side redirect to `/` |

| Location | Responsibility |
| --- | --- |
| `src/App.js` | Routes and language provider composition |
| `src/pages/` | Home and Monomachia pages |
| `src/components/` | Shared content and components |
| `src/data/partners.js` | Partner data |
| `public/` and component asset folders | Public and bundled assets |

## Configuration

From `landing/`:

```sh
cp .env.example .env
```

`REACT_APP_APPLICATION_URL` sets the registration link's application origin.
Use `http://localhost:5173` locally and the environment's HTTPS application origin
for deployment. Unset or blank values fall back to `https://app.karlbruder.com`.
A trailing slash is accepted.

The link targets `/tournaments/registration` and passes the selected language as
`?lang=pt` or `?lang=en`. The site submits no registration data and needs no backend,
database, or Supabase credentials to display its pages.

## Local development

For Compose environment files and the full stack, follow the
[root setup](../README.md#local-setup-with-docker-compose). From the repository root,
start only this site with:

```sh
docker compose up --build landing
```

Open `http://localhost:3000`. The application frontend uses port 5173.

For host development, install Node.js and npm compatible with the lockfile.
The Dockerfile uses Node 20. From `landing/`:

```sh
npm ci
npm start
```

Restart after changing `.env`. For Compose dependency or environment changes,
run `make recreate-landing` from the repository root.

## Build and tests

From the repository root:

```sh
make test-landing
make build-landing
```

Tests use the development Compose image with `CI=true`, without PostgreSQL or
`compose.test.yml`. Local Compose environment files must exist.
`make build-landing` builds the production image with the placeholder application
origin `https://app.example.test`. That image is for checks, not deployment.

For a host build, run `npm run build` from `landing/`. Assets go to `build/`.
There is no separate lint script. The Create React App build includes lint checks.
`src/App.test.js` covers event content, language switching, and registration links.

The production Nginx configuration uses `try_files $uri /index.html` so direct
visits and refreshes on `/monomachia` reach the page. Do not add a directory match
such as `$uri/`. The asset directory `public/monomachia/` would match first and
return 403 instead of the page.

## Continuous integration and deployment

[Landing CI](../.github/workflows/ci-landing.yml) runs on relevant pull requests to
`master` and on manual dispatch. It tests and builds inside Docker, without a
developer `.env` file, production secrets, or live Supabase. Its production build
uses `https://app.example.test` and is not deployed.

The [deployment workflow](../.github/workflows/deploy-application.yml) builds landing
when selected or changed. It embeds `APPLICATION_BASE_URL` as
`REACT_APP_APPLICATION_URL`. Changing that value requires rebuilding and deploying
the image. The cloud edge Nginx routes landing hostnames to this container.

Deployment checks the public landing, application, and API endpoints. Those checks
do not verify every Cloudflare or HTTPS setting. See the
[deployment guide](../docs/deployment.md) for release mechanics and verification
limits, and the [deployment spec](../specs/platform/deployment.md#public-website)
for hosting and cutover requirements.

## Related documentation

[Root setup](../README.md) ·
[Website requirements](../specs/public-website/presentation-and-navigation.md) ·
[Monomachia configuration](../specs/tournaments/events/monomachia-2027.md) ·
[Documentation index](../docs/README.md)
