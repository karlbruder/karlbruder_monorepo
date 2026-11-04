# Karlbrüder

**Created**: 2023-03-24
**Last updated**: 2026-11-04

Monorepo for the Karlbrüder public website and tournament application.
Association membership and equipment inventory are future capabilities.

## Repository map

| Location | Responsibility | Guide |
| --- | --- | --- |
| `landing/` | Public React website | [Landing README](landing/README.md) |
| `frontend/` | React/TypeScript/Vite application | [Frontend README](frontend/README.md) |
| `backend/` | FastAPI, token verification, domain rules, and database access | [Backend README](backend/README.md) |
| `compose.yml` | Local website, application, PostgreSQL, and Ministack | [Local setup](#local-setup-with-docker-compose) |
| `compose.test.yml` | Isolated backend tests without host ports | [Backend checks](backend/README.md#tests-and-lint) |
| `compose.production.yml` | Cloud stack on both dev and prod hosts | [Deployment guide](docs/deployment.md) |
| `Makefile` | Local service, database, and check commands | `make help` |
| `specs/` | Requirements, architecture, ADRs, and open questions | [Specification index](specs/README.md) |
| `docs/` | Current implementation guides and operational runbooks | [Documentation index](docs/README.md) |

The application implements Google and email/password authentication, tournament
registration, private uploads, and retained acceptance/financial evidence.
Staff payment-review and refund commands, results, membership, and inventory are
not implemented. See the [tournament API guide](backend/app/tournaments/README.md)
for current contracts and access restrictions.

Agents follow [AGENTS.md](AGENTS.md) and applicable child instructions. Read only
the specifications and guides needed for the task.

## Local setup with Docker Compose

Install Git and Docker with Compose. Container development does not require host
Python, Poetry, Node.js, or PostgreSQL. Each application has its own environment
file. There is no application environment file at the repository root.

From the repository root:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp landing/.env.example landing/.env
```

On PowerShell, use `Copy-Item` instead of `cp` if needed. Configure these values:

| File | Settings | Local use |
| --- | --- | --- |
| `backend/.env` | `ENV_NAME` | `local` |
| `backend/.env` | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `db`, `5432`, `postgres`, `postgres`, `postgres` |
| `backend/.env` | `SUPABASE_URL` | Hosted Supabase HTTPS project root for token verification |
| `backend/.env` | `AUTH_DB_*` | Separate PostgreSQL connection for the Auth diagnostic, not token verification |
| `frontend/.env` | `VITE_SUPABASE_URL` | Same hosted Supabase project |
| `frontend/.env` | `VITE_SUPABASE_PUBLISHABLE_KEY` | Public `sb_publishable_...` key. Never a secret or service-role key |
| `landing/.env` | `REACT_APP_APPLICATION_URL` | `http://localhost:5173` |

Configure hosted sign-in providers and redirect URLs using the
[frontend guide](frontend/README.md#account-routes-and-supabase-redirect-urls).
Local domain data lives in Compose PostgreSQL. Auth remains hosted in Supabase.
The environment examples contain local defaults, not production credentials.

Start services:

```sh
make up
```

This builds images and starts Compose in the background. `make help` lists the
available commands.

| Service | Local address |
| --- | --- |
| Public website | `http://localhost:3000` |
| Application frontend | `http://localhost:5173` |
| Backend Swagger UI | `http://localhost:8000/api/docs` |
| Backend liveness | `http://localhost:8000/api/health` |
| Domain database diagnostic | `http://localhost:8000/api/health/db` |
| PostgreSQL | `localhost:5432`, database/user/password `postgres` |
| Ministack S3 | `http://localhost:4566` |

Inside Compose, the backend reaches PostgreSQL at `db:5432` and Ministack at
`ministack:4566`. Host tools use `localhost`. Browser upload URLs use
`localhost:4566`.

Before using domain APIs, apply migrations using the
[migration guide](docs/database-migrations.md). Its clean-baseline reset
prerequisite applies to older development schemas. Leave Supabase-managed `auth`
objects intact. Local reset/seed commands are documented in the
[backend guide](backend/README.md#domain-migrations).

### Reload, rebuild, and stop

Application source is mounted for reload. Dependencies stay in the images.
After changing dependencies or an environment file, rebuild the relevant service:

```sh
make recreate-backend
make recreate-frontend
make recreate-landing
```

`make down` stops services and removes the network while retaining PostgreSQL data.
`make down-volumes` also deletes the local database volume.

## Current local integration notes and gaps

Local Vite forwards same-origin `/api` requests to the backend without changing
the prefix. Local Compose runs no Nginx service. Use this proxy for browser API
calls. Direct calls from port 5173 to port 8000 fall outside the backend's current
CORS allowlist, which names only `http://localhost:3000`.

The backend container health check tests domain database connectivity. It does
not verify migrations. Liveness alone does not verify connectivity. The separately
configured Auth diagnostic can fail without disabling JWT verification.
See [backend diagnostics](backend/README.md#diagnostics) for metadata, Auth, and
identity endpoints. The frontend currently has no diagnostics route.

Source inspection does not establish live integration health. Remaining platform
constraints and gaps belong to [local development](specs/platform/local-development.md).

## Application development and checks

Each application has its own lockfile. This repository is not an npm workspace.
Run these targets from the repository root:

| Command | Checks |
| --- | --- |
| `make test-backend TEST_PROJECT=kb-test-your-name` | Pytest in isolated Compose. Choose a unique project name |
| `make lint-backend TEST_PROJECT=kb-test-your-name` | Ruff in isolated Compose |
| `make test-frontend` | Vitest in the frontend development image |
| `make test-landing` | React tests in the landing development image |
| `make ci TEST_PROJECT=kb-test-your-name` | All application tests, lint where configured, and production image builds |

Backend targets clean up their test project. Frontend and landing test targets
use local Compose and require its environment files. `make ci` uses CI placeholders
without developer environment files or live Supabase. See each application README
for focused checks and host development.

## Agentic development

The linked skills own the procedure. Invoke them with `$skill-name` in Codex or
`/skill-name` in Claude Code and Cursor. GitHub operations use the developer's
CLI account and require approval before each `gh` command.

| Step | Skill and example |
| --- | --- |
| Define a new issue | [create-issue](.agents/skills/create-issue/SKILL.md), `$create-issue` |
| Plan an existing issue | [plan-issue](.agents/skills/plan-issue/SKILL.md), `$plan-issue 123` |
| Implement one checkpoint | [implement-issue](.agents/skills/implement-issue/SKILL.md), `$implement-issue 123` |
| Review committed work | [review-issue](.agents/skills/review-issue/SKILL.md), `$review-issue 123` |
| Assess review findings | [debate-issue-review](.agents/skills/debate-issue-review/SKILL.md), `$debate-issue-review 123 <review-path>` |
| Publish committed work | [open-pr](.agents/skills/open-pr/SKILL.md), `$open-pr 123` |

Review the saved plan before implementation. Each checkpoint includes its checks.
The developer reviews, stages, and commits. The agent suggests a message and waits
for authorization before the next checkpoint. Reviews produce findings for the
developer to assess before fixes. The tech lead approves and merges the PR.

Creation, planning, and implementation require an issue. Review, debate, and PR
skills also accept `--source feature/example --target master`. Debate requires
review feedback. Issue URLs may replace numbers.

Plans and review evidence live under Git-ignored `.local/`. Pass their saved paths
to resume in a fresh chat. Keep issues and PRs self-contained because local files
are not shared. Follow the skills for Project status updates and verify issue
closure and Project completion after merge.

## Production direction

Both cloud environments use `compose.production.yml` with edge Nginx, landing,
frontend, and backend. Only Nginx publishes port 443. Cloudflare supplies public
TLS and reaches the self-signed origin using Full mode. Application `/api`
requests go directly to the backend. Other application requests go to the frontend.
Landing hostnames go to the landing container.

Domain data uses hosted Supabase PostgreSQL `public`. There is no production
PostgreSQL or Ministack container. Private files use S3. Supabase Auth mail uses
SES custom SMTP. Backend application notifications through SES remain future work.

The [deployment guide](docs/deployment.md) owns current infrastructure, workflow,
build inputs, and release checks. The [deployment spec](specs/platform/deployment.md)
owns requirements and unresolved operational concerns. Workflow presence alone
does not establish live deployment or recovery health. Use the
[documentation index](docs/README.md) for AWS team access and operational runbooks.
