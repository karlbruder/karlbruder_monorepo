# E2E seed package

These instructions add to the parent [E2E infrastructure instructions](../AGENTS.md).
The [E2E guide](../../../e2e/README.md) owns stack setup and diagnostics.

## Structure

- `__main__.py` runs the seed and prints fixture metadata as JSON.
- `accounts.py` creates and verifies synthetic Auth accounts for the journeys.
- `tournaments.py` creates the tournament, payment, and waitlist fixtures.
- `e2e/fixture-data.ts` defines the metadata consumed by Playwright tests.

The E2E runner starts a disposable Compose stack, applies migrations, runs
`python -m seeds` in the backend container, and passes the JSON to Playwright.
`e2e/tests/seed.spec.ts` is an agent exploration entry point. It does not seed
application data and is excluded from the normal suite.

## Changes and verification

- Use synthetic data only. Keep each stateful journey isolated from other tests.
- Group seeds by scenario or responsibility. Add a short module docstring that
  identifies the journeys supported. Extract a new module when a distinct
  scenario makes the existing module harder to navigate.
- Keep fixture metadata and `e2e/fixture-data.ts` in sync. Write only the JSON
  metadata to stdout because the runner saves stdout as the fixture file.
- Run seeds through the disposable E2E stack, not a development or production
  database. Do not alter Supabase-managed Auth tables directly.
- Run `make test-e2e` from the repository root after changing seeds. To run one
  journey on a fresh stack, use `./scripts/e2e/run.sh tests/<name>.spec.ts`.
  The runner removes the stack and its volumes when it exits.
