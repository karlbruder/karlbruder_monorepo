# Karlbrüder public website

**Created**: 2026-10-17
**Last updated**: 2026-11-02

Public React single-page website for `karlbruder.com`, built with Create React App (`react-scripts`). It introduces the group and presents Monomachia. Authenticated tournament workflows belong in [frontend](../frontend/README.md) and [backend](../backend/README.md).

## Pages and content

| Route | Current content |
| --- | --- |
| `/` | Group presentation, training, weapons, gallery, partners, and contact sections |
| `/monomachia` | Event presentation, Portuguese/English language selection, sponsors, the official Instagram link, and registration handoff to the private application |
| Other paths | Client-side redirect to `/` |

`src/App.js` defines routes; pages live in `src/pages/`, shared content/components in `src/components/`, and partner data in `src/data/partners.js`. Public assets live in `public/` and source assets alongside the components.

The Monomachia registration link opens `https://app.karlbruder.com/tournaments/registration` under the [website specification](../specs/public-website/presentation-and-navigation.md). Registration and sign-in happen in the private application. Public-site content is maintained separately and does not fetch event facts from the backend.

## Local development

Copy `.env.example` to `.env` in this directory. `REACT_APP_APPLICATION_URL` sets the registration link's application origin. Local development uses `http://localhost:5173`. A trailing slash is accepted. When the variable is unset, the link uses `https://app.karlbruder.com`. The link always targets `/tournaments/registration` on that origin. Do not put the localhost value in a deployed environment. The landing site does not submit registration data and does not need backend, database, or Supabase credentials to display its pages.

Install Node.js and npm compatible with the checked-in lockfile when running on the host. From `landing/`:

```sh
npm ci
npm start
```

Local Compose runs this development server at `http://localhost:3000`. The application frontend stays on 5173. From the repository root:

```sh
docker compose up --build landing
```

Production runs this site as the landing container in `compose.production.yml`. Nginx sends the landing hostnames to that container.

To run the existing React tests in that same image:

```sh
make test-landing
```

Those tests do not use `compose.test.yml`. They do not need PostgreSQL. Host `npm start` and `npm test` remain available from this directory.

## Build and tests

From `landing/`:

```sh
npm run build
npm test -- --watchAll=false
```

The static build is written to `build/`. The existing `src/App.test.js` checks Monomachia content and language switching. There is no separate lint script; use the package's build/test commands. The production landing image serves `index.html` for a direct visit or a refresh on `/monomachia`. Nginx must not treat that path as a directory. `public/monomachia/` holds static files such as `logo.svg`, and a directory match returns 403 before the page fallback.

## Continuous integration and deployment

The existing GitHub Actions workflows are:

- [Landing CI](../.github/workflows/ci-landing.yml): on pull requests to `master` that change landing files or this workflow, and on manual runs. It runs the tests and the production image build inside Docker. The production build is the lint check, because Create React App has no separate lint script. The image build uses `https://app.example.test` as `REACT_APP_APPLICATION_URL`. That image is not deployed.
- [Frontend CI](../.github/workflows/ci-frontend.yml) and [backend CI](../.github/workflows/ci-backend.yml) follow the same Docker requirement. Backend pytest and Ruff use `compose.test.yml`. None of these checks read a developer `.env` file, a production secret, or a live Supabase project. New application CI should run in Docker the same way.
- [Deploy](../.github/workflows/deploy-application.yml): builds the landing image when landing files change, pushes it to ECR, and replaces the landing container. The build embeds `APPLICATION_BASE_URL` from the selected GitHub environment as `REACT_APP_APPLICATION_URL`. That must be the real application origin for that environment, not `http://localhost:5173`. Changing the variable requires a new landing image.

The workflow files do not verify that Cloudflare routing or HTTPS is configured. Organizational hosting and cutover requirements live in the [deployment spec](../specs/platform/deployment.md#public-website).

## Related documentation

[Root README](../README.md), [public website spec](../specs/public-website/presentation-and-navigation.md), [Monomachia configuration](../specs/tournaments/events/monomachia-2027.md), [deployment](../specs/platform/deployment.md).
