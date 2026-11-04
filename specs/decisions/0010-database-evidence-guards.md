# 0010: Database guards for immutable evidence

**Created**: 2026-11-04
**Last updated**: 2026-11-04

| Field | Value |
| --- | --- |
| Status | Implemented choice |
| Sources | Agent-selected persistence mechanism in [issue #69](https://github.com/karlbruder/karlbruder_monorepo/issues/69). Product-owner request on 4 November 2026 to document why it exists. This records the implementation rationale without claiming the owner selected PostgreSQL functions |

## Context

The evidence contract requires accepted content, proof decisions and verified
receipts to remain attributable to the same recorded facts. A later ORM update,
bulk SQL operation or maintenance script must not silently rewrite that history.

Checking only the normal service path leaves other database write paths able to
bypass that contract. An ORM hook also does not intercept every direct SQL write.
The issue #69 review demonstrated this concretely: changing a reviewed proof's
StoredFile storage key redirected the existing review to different evidence,
even though the review and document association themselves were protected.

## Decision

Use PostgreSQL trigger functions for a limited set of evidence invariants.
Alembic creates the functions and attaches triggers to the affected tables.
PostgreSQL invokes them during writes. Application services do not call them as
stored workflow procedures.

Use ordinary foreign keys, uniqueness, non-null and check constraints wherever
they express the requirement. The functions cover protected changes to existing
rows and relationships that need values from other records.

## What each function protects

| Function | Invariant and reason for a function |
| --- | --- |
| `reject_evidence_mutation` | Reject updates/deletes of acceptance snapshots, archives, proof reviews, payments and registration payment/refund associations. A row check cannot compare an update with its previous value or forbid deletion |
| `protect_archived_file_metadata` | Prevent changes/deletion of StoredFile metadata referenced by an archive. Protecting the archive row alone leaves its target mutable |
| `validate_payment_proof_review` | Require a payment-proof document rather than another document purpose. Lock its document and file rows while accepting the review |
| `validate_registration_payment` | Require an approved review of a proof belonging to the same registration. Foreign keys alone establish existence, not that combined relationship |
| `validate_registration_refund` | Require the shared Refund to refer to the associated registration's Payment and owe its exact received amount. This is the tournament's full-refund invariant, not a generic payments rule |
| `protect_reviewed_document` | Freeze a document association once it has a review. Unreviewed documents do not receive this additional guard |
| `protect_reviewed_proof_file` | Freeze the StoredFile metadata behind reviewed evidence. This closes the indirect storage-key rewrite demonstrated during review |
| `protect_refund_obligation` | Keep the source payment, amount owed and obligation time fixed while allowing status/completion fields to be updated subject to their row checks |

Shared immutability mechanisms protect shared facts. Conditions involving
registration proofs or tournament refund policy remain tournament-specific schema
rules. Their presence on a shared table does not require core or payments Python
modules to import tournaments.

## Why not only application validation

Services still validate domain rules and provide useful errors. The database
adds a final rejection point for writes that bypass those services. This matters
because these are retained historical facts, not just temporary form values.

A foreign key cannot by itself require that a review is approved, its document is
a payment proof and that document belongs to the linked registration. A row check
cannot independently look up all those records. Some relationships could instead
be expressed through additional composite keys and duplicated association columns.
That is a possible redesign, but it would still leave append-only evidence and
conditional file protection needing enforcement.

The selected lookup guards lock the referenced rows while validating a write.
This coordinates those checks with conflicting writes. It is not a replacement
for the transaction and concurrency design of the future staff commands.

## Limits and costs

- Rules now exist in both application code and schema migrations. A reader must
  inspect both to understand a write failure. PostgreSQL-specific code and tests
  are a deliberate maintenance cost.
- Alembic model comparison does not verify trigger bodies. Tests must exercise
  ORM and direct SQL mutation attempts against the migrated PostgreSQL schema,
  and downgrade must remove the functions with their dependent tables.
- Guards do not establish that an actor is an authorized admin. Services still
  verify identity, authorize access and supply the recorded actor and time.
- Guards do not implement staff approval, seat allocation, refund deadlines,
  notifications or a complete refund state machine. Completion fields remain
  updateable under the current checks. Financial facts stay protected.
- Database protection does not lock S3 bytes or stop storage-object replacement.
  That limit is separate from preserving the database reference and digest.
- These guards govern normal row writes with triggers enabled. A sufficiently
  privileged operator can change the schema, disable guards or use destructive
  operations outside that path. They are not tamper-proof audit storage or a
  substitute for access controls, backups and operational review.

This is a targeted persistence choice, not a default instruction to move business
workflows into the database. Prefer ordinary constraints and domain services for
new rules. Revisit a guard when its invariant changes, its enforcement becomes
redundant or its coupling costs outweigh the required protection. Removing one
requires preserving the agreed evidence guarantee through another explicit design.

## References

[Shared files](0008-shared-files-and-archives.md),
[shared payments](0009-shared-payments-and-domain-associations.md),
[initial migration](../../backend/alembic/versions/20261103_0001_initial_domain_schema.py),
[financial evidence tests](../../backend/tests/tournaments/models/test_registration_finances.py),
[archive tests](../../backend/tests/core/files/test_archiving.py),
[migration verification](../../docs/database-migrations.md),
[privacy and consent](../tournaments/consent-and-privacy.md),
[payments and confirmation](../tournaments/payments-and-confirmation.md).
