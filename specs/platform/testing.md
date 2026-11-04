# Backend concurrency testing

**Created**: 2026-11-04
**Last updated**: 2026-11-04

| Field | Value |
| --- | --- |
| Status | Deferred engineering follow-up |
| Scope | A future issue for a shared pytest marker and race-test methodology |
| Applications | backend |
| Source | Product-owner direction during issue #60 implementation on 4 November 2026 |

## Decision and current scope

Defer the new payment-review concurrency test suite and its special test-runner
integration from issue #60. Keep the production transaction locks, current-proof
checks, atomic persistence, and capacity rules. Ordinary workflow and rollback
tests remain in scope. Existing registration concurrency coverage is preserved.

Earlier experimental race tests ran during implementation. Their results remain
historical evidence in the saved issue plan. Those tests are removed from the
current change and are not maintained regression coverage.

This defers test infrastructure and coverage, not the required behavior under
concurrent requests. In particular, [CAP-003 and CAP-AC-002](../tournaments/capacity-and-waitlist.md)
still require that competing confirmations cannot overbook a tournament.
Sequential tests alone do not establish that acceptance criterion.

## Future issue: standardize concurrency tests

Create a separate delivery issue from this specification when that work is scheduled.
No GitHub issue is created by recording this follow-up.

The issue must:

- Register a `concurrency` pytest marker and document how to select the marked tests.
- Inventory race-sensitive behavior across the implemented backend workflows and
  map each case to its domain rule, expected outcome, and current coverage.
- Define one reusable methodology for overlapping database transactions. Use the
  isolated Compose PostgreSQL stack and a separate session per concurrent operation.
  Decide how shared fixtures become visible and how committed evidence is cleaned up.
- Use deterministic coordination and bounded waits. Failures must identify the
  competing operations and expected persisted result. Avoid timing-dependent sleeps.
- Define how fresh-session reads verify committed outcomes and how mocked external
  calls verify that delivery follows commit and does not replay on conflicts.
- Decide and document default test selection, explicit execution, and CI integration.
  Keep ordinary tests isolated from committed race-test fixtures. Preserve database
  evidence guards and guarantee test-stack cleanup.

## Initial race inventory

| Area | Cases to assess and cover |
| --- | --- |
| Registration | Concurrent number allocation and duplicate active-registration attempts. Audit the existing registration race test before migrating it to the shared methodology |
| Capacity | Two approvals with one remaining seat. Confirm at most one registration and persist the other paid-waitlist outcome |
| Proof review | Repeated or competing approvals, and approval versus rejection of the same proof. Persist one decision and at most one receipt without duplicate notices |
| Proof replacement | Replacement versus approval/rejection. Review only the exact current submission and preserve proof history |
| Commit and delivery | Verify saved outcomes and released locks before account lookup or SMTP. Delivery failure leaves the committed decision intact |

The future inventory must inspect all implemented workflows rather than treating
this initial list as exhaustive. Add later workflows when they exist, without
building unrelated product features as part of the testing issue.

## Acceptance for the future issue

- The marker is registered and its documented selection works.
- Existing race coverage is assessed and retained or replaced with equivalent coverage.
- The inventory identifies covered and outstanding cases with explicit ownership.
- Concurrent operations use independent transactions against the same test database.
- Tests assert final persisted state, conflicts, and relevant external side effects.
- The documented local and CI commands terminate on failure and remove test resources.

## Related specifications

[Local development](local-development.md), [capacity](../tournaments/capacity-and-waitlist.md),
[payments](../tournaments/payments-and-confirmation.md), and
[registration](../tournaments/registration.md).
