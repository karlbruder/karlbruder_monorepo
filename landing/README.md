# Karlbrüder public website

Public React single-page website for `karlbruder.com.br`, built with Create React App (`react-scripts`). It introduces the group and presents Monomachia. Authenticated tournament workflows belong in [frontend](../frontend/README.md) and [backend](../backend/README.md).

## Pages and content

| Route | Current content |
| --- | --- |
| `/` | Group presentation, training, weapons, gallery, partners, and contact sections |
| `/monomachia` | Event presentation, Portuguese/English language selection, sponsors, and the official Instagram link |
| Other paths | Client-side redirect to `/` |

`src/App.js` defines routes; pages live in `src/pages/`, shared content/components in `src/components/`, and partner data in `src/data/partners.js`. Public assets live in `public/` and source assets alongside the components.

The current Monomachia page links to Instagram. Registration is not implemented in the landing site; future registration links must lead to `app.karlbruder.com/tournaments/registration` under the [website specification](../specs/public-website/presentation-and-navigation.md). Public-site content is maintained separately and does not fetch event facts from the backend.

## Local development

Install Node.js and npm compatible with the checked-in lockfile, then run from `landing/`:

```sh
npm ci
npm start
```

The development server normally serves `http://localhost:3000`. This is the public website's default port; the separate application frontend uses 5173. The landing site is not a Compose service and requires no backend, database, or Supabase credentials to display its current pages. No application-specific environment variables are currently required.

## Build and tests

From `landing/`:

```sh
npm run build
npm test -- --watchAll=false
```

The static build is written to `build/`. The existing `src/App.test.js` checks Monomachia content and language switching. There is no separate lint script; use the package's build/test commands. A production static host must serve the SPA entry point for direct visits and refreshes on `/monomachia`; React routing alone does not configure an S3/CDN fallback.

## Continuous integration and deployment

The existing GitHub Actions workflows are:

- [CI](../.github/workflows/ci-landing.yml): installs dependencies and builds on pull requests targeting `master` when landing files or its CI workflow change; it also supports manual runs. It does not currently run the test suite.
- [Deployment](../.github/workflows/deploy-landing.yml): installs dependencies, builds, and synchronizes `build/` to S3 on pushes to `master` or manual runs. Its push trigger currently has no path filter, so changes outside `landing/` can also trigger deployment.

Deployment requires these repository settings:

| Setting | Kind | Purpose |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | Secret | Deployment AWS credential |
| `AWS_SECRET_ACCESS_KEY` | Secret | Deployment AWS credential |
| `AWS_REGION` | Variable | AWS destination region |
| `LANDING_S3_BUCKET_NAME` | Variable | Target static-site bucket |

The workflow's S3 sync uses `--delete`, removing destination objects absent from the build. These variables describe the current workflow; verify the target account/bucket before a live deployment. The landing CI workflow explicitly sets up Node.js; the deployment workflow currently relies on the runner's available Node/npm runtime.

The workflow files do not verify that the account migration, Cloudflare routing, HTTPS, or SPA deep-link fallback is configured in production. Organizational hosting and cutover requirements live in the [deployment spec](../specs/platform/deployment.md#public-website). The public site remains separate from the planned application `compose.prod.yml` stack.

## Related documentation

[Root README](../README.md), [public website spec](../specs/public-website/presentation-and-navigation.md), [Monomachia configuration](../specs/tournaments/events/monomachia-2027.md), [deployment](../specs/platform/deployment.md).
