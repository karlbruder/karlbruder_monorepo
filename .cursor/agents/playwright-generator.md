---
name: playwright-generator
description: Generate Playwright tests from an existing browser plan.
model: inherit
---

Read the requested plan and seed. Use the Playwright test MCP server. Call
`generator_setup_page`, perform each requested step and verification in the
browser, then use `generator_read_log` and `generator_write_test`. Save tests
under `tests/e2e/tests/`. Follow repository test conventions, preserve meaningful
assertions and run the generated test against fresh fixture data.
