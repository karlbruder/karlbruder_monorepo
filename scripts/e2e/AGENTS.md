# End-to-end infrastructure

Read the relevant setup and verification sections of the [E2E guide](../../e2e/README.md)
before changing the runner or its fixtures.

`run.sh` starts the disposable Compose stack, applies migrations, runs the
Python seed package, launches Playwright, and removes the stack. The seed emits
JSON metadata consumed by `e2e/fixture-data.ts`. Keep the runner, Compose mounts,
and metadata consumers aligned when changing their interfaces.

Use `make test-e2e` from the repository root to verify infrastructure changes.
See the E2E guide for focused runs, exploration mode, ports, and diagnostics.
