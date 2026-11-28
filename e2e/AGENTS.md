# End-to-end tests

Read the relevant setup and verification sections of the [E2E guide](README.md)
before changing journeys or their infrastructure. Read its Playwright-agent
setup only when using that workflow.

- `tests/*.spec.ts` contains browser journeys. `tests/seed.spec.ts` is only an
  agent exploration entry point and is excluded from the normal suite.
- `fixture-data.ts` reads the metadata emitted by the Python seed package in
  `scripts/e2e/seeds/`. Keep its shape and consumers in sync with the seeds.
- Use synthetic data and isolate stateful journeys so tests can run concurrently.
  Exercise real service boundaries and assert user-visible outcomes.
- Name fixtures and their metadata for the scenario or use case they support.
  Do not use issue numbers in their names. Apply this rule when planning and
  implementing E2E tests.
- Run `make test-e2e` from the repository root for the complete suite. For a
  focused run, use `./scripts/e2e/run.sh tests/<name>.spec.ts`. Both use a fresh
  disposable stack and clean it up. The fixed E2E host ports prevent concurrent
  stack runs on the same host.
