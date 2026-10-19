# Operational runbooks

Runbooks describe how to operate an implemented system. Intended hosting and access requirements live in the [platform specs](../../specs/platform/deployment.md).

Local setup and verification commands are documented in the [root README](../../README.md), [backend README](../../backend/README.md), [frontend README](../../frontend/README.md), and [landing README](../../landing/README.md). Known application/configuration gaps are recorded in the [local-development spec](../../specs/platform/local-development.md).

The README review on 17 October 2026 checked these instructions against source, package scripts, environment examples, Compose, and workflow files. It did not start services, execute application tests, or verify live deployments. There are no implemented deployment, backup, or recovery runbooks in this directory yet.

Add a deployment, recovery, backup, or access runbook when the corresponding operational path is implemented and verified. Include prerequisites, environment, steps, expected result, verification date, and any recovery procedure that actually exists. Do not document a planned cloud configuration as deployed.
