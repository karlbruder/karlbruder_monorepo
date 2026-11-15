# 0010: Database functions, triggers and procedures

**Created**: 2026-11-04
**Last updated**: 2026-11-15

| Field | Value |
| --- | --- |
| Status | Accepted |
| Sources | Product owner decision on 15 November 2026, replacing the earlier evidence-guard design |

## Decision

Application-defined database functions, triggers and stored procedures are
forbidden. Do not add them in migrations, manual setup, or other application
infrastructure. This applies to audit enforcement, validation and workflows.
Supabase-managed objects are outside the application's control and this decision.

The backend owns authorization, validation, workflow rules and concurrency. Use
server-side code and transactions for checks. Keep the database straightforward
and allow authorized operators to correct records directly. Ordinary relational
constraints, such as foreign keys, uniqueness, non-null and row checks, remain
available for data shape and referential integrity. They must not be used to
reintroduce audit-driven immutability.

Direct database changes bypass backend checks. The operator is responsible for
keeping related records consistent. For example, correcting a payment may also
require correcting a pending refund. A completed refund needs reconciliation
against the money actually returned.

## Why

The earlier design used PostgreSQL trigger functions to freeze accepted
information, payment records and related data, and to check relationships across
several tables. This assumed a level of audit enforcement the application does not
need. It made routine corrections hard. In particular, an incorrectly entered
payment amount could not be corrected by an ordinary database update, even though
it was shown to the athlete and could determine a refund.

The guards also put business logic in migrations as well as application code.
They made failures harder to understand and required special cleanup and tests.
This was a poor outcome for the product and its operations. The project therefore
removed the application-owned trigger functions and prohibits introducing more.

## Consequences

Backend services must preserve business rules and handle concurrent requests with
appropriate transactions, locks and ordinary constraints. Staff still cannot
change declarations through the athlete registration page. Retention and access
rules remain product requirements, not a requirement to freeze database rows.
There is no payment-correction interface. Authorized operators may make necessary
corrections in the database.
