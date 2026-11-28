# End-to-end tests

**Created**: 2026-11-20
**Last updated**: 2026-11-28

These tests exercise the application through a browser and real service boundaries.
The stack and its data are disposable. The suite covers readiness, sign-in,
registration for a selected tournament, staff payment approval, waitlist selection and cancellation, and confirmed-registration cancellation and refund completion.

## What runs where

Docker Compose runs the frontend, backend, PostgreSQL, Supabase Auth, and
Ministack. PostgreSQL has separate domain and Auth databases. The backend checks
real Auth tokens against the local Auth service's JWKS. Ministack supplies S3
for private uploads. Vite forwards `/api` requests to the backend.

Node.js, Playwright, and Chromium run on the host. Docker, Docker Compose,
OpenSSL, and `make` are also required on the host. The stack does not need the
ordinary development environment files or a hosted Supabase project. The backend
SMTP and Sentry integrations are disabled. Auth uses automatic confirmation and
a no-op mailer. The E2E backend uses an empty container-only `.env` file and
Compose settings, so a developer's `backend/.env` does not affect the run.

The frontend, Auth gateway, and S3 endpoint bind only to loopback ports 5174,
54331, and 4567. PostgreSQL and the backend are not published. The normal
development stack keeps its existing ports.

## Install and run

From the repository or worktree root:

```sh
npm ci --prefix e2e
npx --prefix e2e playwright install chromium
make test-e2e
```

`npm ci` installs the locked Playwright package under this folder. The install
command downloads the matching Chromium to the host's Playwright browser cache.
The test command builds and starts the services, waits for readiness, applies
Alembic migrations, seeds synthetic data, runs the tests, and removes the
project's containers, network, and volumes. It also tears down after a failure.
To run the payment journey alone on a fresh stack, use:

```sh
./scripts/e2e/run.sh tests/payment-approval.spec.ts
```

Run the cancellation and refund journeys alone with `./scripts/e2e/run.sh tests/cancellation-refund.spec.ts`. They use separate refundable tournaments and synthetic payments.

Run the waitlist journeys alone with `./scripts/e2e/run.sh tests/waitlist.spec.ts`. They use isolated capacity-one tournaments and synthetic accounts. One tournament has a refundable cancellation policy.

Each run chooses a project name beginning with `kb-e2e-`. Set `E2E_PROJECT` to
another unique name with that prefix if needed. A run refuses to reuse an
existing project's resources. Runs use fixed host ports and cannot run in
parallel with another E2E run on the same host.

The Python seed package under [`scripts/e2e/seeds/`](../scripts/e2e/seeds/) creates accounts and tournament fixtures. Playwright runs the browser journeys after the seed completes. The separate `tests/seed.spec.ts` starts Playwright agent exploration and is excluded from the normal suite.

The bootstrap creates temporary Auth signing keys, an internal HTTPS certificate,
and fixture metadata. They are deleted during cleanup and are not test artifacts.
The fixture accounts and password are synthetic. Their values are in
[`scripts/e2e/seeds/accounts.py`](../scripts/e2e/seeds/accounts.py). Never use them outside this
stack.

After a failure, service logs are retained in `e2e/artifacts/services.log`.
The HTML report is in `e2e/playwright-report/`. Failure traces are in
`e2e/test-results/`. These generated files are ignored by Git. Open the
report with:

```sh
./e2e/node_modules/.bin/playwright show-report e2e/playwright-report
```

## Playwright agents

The planner explores a live application and writes a browser plan. The generator
uses that plan to create tests. The healer proposes changes for failing tests.
Agents use model calls only when invoked. Normal test runs execute the checked-in
Playwright code without invoking an agent or requiring model API credentials.

The healer cannot reliably decide whether a failure is a stale test or a product
regression. Review its proposed diff against the expected behavior and failure
evidence. Keep meaningful assertions. Fix the application when it violates the
expected behavior.

For agent-assisted Playwright work, prefer Cursor with a Grok model when Cursor,
Grok, and the integration are available. Otherwise use the Codex setup below.
Choose a model and reasoning effort appropriate to the task. Start with a lower
effort for straightforward work and increase it when the evidence calls for it.
Keep prompts and delegated tasks focused. Check the model actually used and its
usage in Cursor. Model availability and pricing depend on the account.

### Cursor setup

1. Install the dependencies and Chromium using the commands above. Open the
   repository root as a Cursor project.
2. In Cursor's MCP settings, enable `playwright-test` and `playwright-healer` from the project's
   [`.cursor/mcp.json`](../.cursor/mcp.json) and check that its tools connect.
   Both use the locked Playwright package. The planner and generator use the
   seed-only configuration. The healer uses the normal test configuration.
3. Select an available Grok model in Cursor. The project subagents inherit that
   model. If Grok or the MCP connection is unavailable, use Codex instead.
   Cursor may choose another model if a configured model is unavailable, so
   inspect the subagent task card rather than assuming which model ran.
4. Run `E2E_MODE=explore make test-e2e` in a separate terminal and wait for the
   frontend URL and fixture metadata. Keep it running during browser work. The
   exploration stack exposes fixture metadata through an ignored temporary link
   that is removed with the stack. Start a fresh stack for each journey.
5. Ask Cursor to use `/playwright-planner` for the desired journey, then
   `/playwright-generator` for the reviewed plan. Use `/playwright-healer` to
   investigate a failing test. Review its diagnosis before changing behavior.
   Press Enter in the exploration terminal when finished, then run
   `make test-e2e` against fresh data.

The Cursor definitions in [`.cursor/agents/`](../.cursor/agents/) adapt the
Playwright planner, generator, and healer workflows to Cursor subagents.
Playwright does not provide a Cursor-specific `init-agents` option. Review the
definitions and MCP connection after updating Playwright or Cursor.
See [Playwright Test Agents](https://playwright.dev/docs/test-agents),
[Cursor MCP](https://cursor.com/docs/mcp), and
[Cursor subagents](https://cursor.com/docs/subagents).

### Codex setup

The generated definitions are in [`.codex/agents/`](../.codex/agents/). The
project's [`.codex/config.toml`](../.codex/config.toml) connects the
`playwright-test` and `playwright-healer` MCP servers to the parent Codex session.
The former uses `playwright.agents.config.ts` and discovers only the seed. The
healer uses the regular configuration, which discovers the journey tests and
excludes the seed. Both use the locked Playwright package.

After installing the dependencies above:

1. Open this repository or worktree as the Codex project and trust the project
   configuration when prompted. After changing MCP configuration, restart the
   app if needed and reopen the same chat. Verify that the server is connected.
2. If the Codex CLI is installed on your PATH, run `codex mcp list` from the
   worktree root and check that `playwright-test` is enabled. In the Codex
   terminal interface, `/mcp` shows active connections. The desktop app can be
   used without a separately installed CLI. In that case, ask Codex in this chat
   to check both active Playwright MCP connections. A listed server does not by itself
   prove that the chat connected to it.
3. In a separate terminal, run `E2E_MODE=explore make test-e2e`. Wait for the
   frontend URL and temporary fixture metadata path. Leave the terminal open
   while the agents explore. The metadata identifies the seeded tournaments, payment registration,
   and staff account UUID. Press Enter when finished to tear down the stack.
4. In the chat, ask Codex to use the Playwright planner with the agent seed
   and the relevant journey. Review the resulting plan. Then ask it to use the
   generator against that plan. Run `make test-e2e` from fresh data to verify the
   result. Use the `playwright-healer` server for a focused proposed fix when a
   test fails. A fresh exploration stack supplies its fixture metadata.

The agents need the parent session's MCP connection. An MCP entry inside an agent
definition alone does not connect the parent session. No global `codex mcp add`
command is needed for this project configuration. If the server cannot start,
confirm the project is trusted, `node` is on the host PATH, `npm ci` succeeded,
and Codex is running from the worktree root. Check the active MCP list in the
chat. Keep credentials and browser session files out of plans and artifacts.

The definitions were generated with `playwright init-agents --loop=codex` and
adapted to the worktree's locked package and agent config. Regenerate and review
them when Playwright changes. Regeneration can overwrite those adaptations.
See [Playwright Test Agents](https://playwright.dev/docs/test-agents) and
[Codex MCP configuration](https://developers.openai.com/codex/mcp).
