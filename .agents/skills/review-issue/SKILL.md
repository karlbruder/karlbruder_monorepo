---
name: review-issue
description: Review an issue implementation or explicit source/target branch diff adversarially, saving prioritized findings and runnable probes for independent debate. Use for issue or branch review, not implementation or automatic fixes. Use only when the user explicitly invokes review-issue.
---

# Review Issue

Use this workflow only when the user explicitly invokes `$review-issue`, `/review-issue`,
or names this skill and asks to use it. Continue an active invocation across turns,
but do not start another lifecycle skill automatically. Ordinary problem discussion,
implementation, or review requests do not activate this skill.

Review the code adversarially. Assume the author may be wrong. Understand intent first, then hunt for defects in the code itself. Meeting the acceptance criteria is the minimum bar, not the finish line. A review is evidence to evaluate, not an instruction to implement every suggestion.

## Establish the review boundary

Accept an issue number/URL, optional plan path, `--source <branch>`, `--target <branch>`, repository, and optional model label. Resolve the repository before Git operations.

- Issue mode: use the issue as context and verified source/base information from an available plan. A plan is optional. Otherwise default to the current branch against `master` in this repository (the verified default branch in another repository).
- Branch mode: supplying `--source` or `--target` selects a branch-based review. Explicit refs override plan/issue-derived refs. For an omitted source use the current branch. For an omitted target use `master` here. No issue or plan is required. If an issue is also supplied, it is supplemental context and does not change the branch-based storage namespace.
- If neither an issue nor branch arguments are supplied or established in context, ask which issue or branch comparison to review. Verify refs and ask about ambiguity or missing refs rather than substituting another branch.

Read the supplied issue and relevant clarifications when available, the selected plan when relevant, applicable AGENTS.md, and changed code with enough context to understand behavior. In branch mode, establish intent from the actual diff, commits, and documented behavior. Do not invent issue requirements or require a ticket. Consult only relevant spec excerpts needed to resolve requirements or invariants. Ask about unclear product intent or conflicting requirements.

Examples: `$review-issue 123` or `$review-issue --source feature/payments --target master`.

Verify refs and record source SHA, target SHA, merge-base SHA, branch names, date, repository, mode (issue or branches), optional issue URL, model label, and working-tree status. Review the pinned three-dot diff (`target...source`) and relevant commits. An empty diff means stop and report no changes to review. Uncommitted files are outside this branch review. Report them and avoid treating their contents as the pinned source. Use a disposable isolated checkout if necessary to inspect or execute the exact revision without switching or disturbing the developer's work.

## Review critically

State the intended outcome and any established acceptance criteria before judging implementation. Then run two passes. Do both. Neither replaces the other.

**Pass 1, requirements.** Check the change against the agreed behavior and applicable rules. Record unmet criteria.

**Pass 2, code quality.** Ignore the checklist and read the diff as a skeptic. Challenge every changed function against these lenses:

- Edge cases: empty, null, duplicate, boundary, and malformed input.
- Error paths: swallowed exceptions, wrong status codes, partial failure, missing rollback.
- State and concurrency: races, double submit, retries, idempotency, stale reads.
- Hidden coupling: shared state, import cycles, assumptions about callers or ordering.
- Authorization and data handling: backend enforcement, ownership checks, leaked fields, personal data in logs.
- Database: missing constraints, N+1 queries, unsafe migrations, transaction scope.
- Tests: new behavior with no test, tests that assert the implementation instead of the rule, missing failure cases.
- Performance and resource use when the path is hot or unbounded.
- Naming, duplication, and misplaced responsibility when they hide bugs or raise the cost of the next change.

A passing requirements pass does not excuse findings from pass 2. Do not stop after the first pass.

A security or privacy finding needs a reachable failure with practical impact. An applicable requirement is not needed. Rate severity using actual access, data, and deployment conditions. Trace behavior beyond changed hunks when necessary to prove impact.

For each actionable finding, identify a concrete trigger, expected requirement, observed behavior, affected file/symbol and line at the reviewed SHA, practical impact, and evidence. Distinguish introduced defects from pre-existing limitations and work explicitly deferred by the issue/specs. A closed ticket is not proof its behavior exists. Do not declare something deferred without a verified reference or developer confirmation. Future scope does not excuse a current acceptance failure.

Do not drop a suspicion because no requirement mentions it. Record it as a finding with the right tag. Speculative hardening goes in at P3 and is marked `unverified`. Unrelated pre-existing limitations go in a separate "Pre-existing" list outside the fix list.

Classify every finding as one of three kinds:

- Wrong or lacking: incorrect behavior, missing handling, missing tests.
- Underengineered: the minimum was built but it will break under realistic use.
- Over engineered: extra code or workflow with a concrete maintenance cost that does not serve the scoped behavior.

Tag evidence on each finding:

- `reproduced`: a probe or existing test demonstrated it.
- `structural`: obvious from the code, a probe adds nothing.
- `unverified`: suspected, not shown.

Probe every P0 to P2 candidate unless it is `structural`. Run the probe on source and on target to tell introduced defects from pre-existing ones. A reproduced finding beats a described one. An `unverified` finding cannot be P0 to P2. A failing probe is not proof until its setup, assumptions, and expected result are justified. Follow [evidence and probe rules](references/evidence.md).

Assign stable IDs `R1`, `R2`, etc. Use priorities: P0 immediate critical harm/blocker, P1 serious issue to fix before merge, P2 material normal-priority issue, P3 optional improvement/nit. Explain priority from impact and likelihood, not reviewer confidence. Record confidence and scope separately.

## Save the review and evidence

Follow [evidence and probe rules](references/evidence.md). Save each run under:

- Issue mode: `.local/review-issue/issue-<number>/<target>__<source>__review-<N>__<model>/`
- Branch mode: `.local/review-issue/<target>__<source>/review-<N>__<model>/`

For example, `--source feature/payments --target master` uses `.local/review-issue/master__feature-payments/review-1__sol/`.

Sanitize branch labels by replacing `/` and other path-unsafe characters with `-`, retaining the original refs in report metadata. Use `<target>__<source>` as the branch namespace, matching GitHub base (target) then compare (source). New runs use this order. Preserve older source-first reports without renaming them. If distinct refs map to a namespace already used by another pair, append the first 8 hexadecimal characters of SHA-256 of the UTF-8 string `target + \0 + source` (original refs separated by a NUL byte), and verify the stored pair before reusing it. Record the selected namespace in the report so debate-issue-review uses the same folder name. Use the same namespace calculation in both skills. Use sanitized model labels. Use a supplied model label or the actual known model. Ask if unavailable rather than inventing it. Allocate the next free N for this branch pair and model, creating the directory exclusively and retrying on collision. Never overwrite an earlier run. Save `review.md` and any `probes/` files inside that run.

Start the report with the recorded boundary metadata. Then write these sections in order:

1. Intent: what the change tries to do, and the acceptance criteria checked.
2. What was done right: brief and specific. Say so plainly if the diff is sound.
3. Findings table: ID, priority, kind, evidence tag, origin (`introduced` or `pre-existing` when probed), title, location, probe link.
4. Finding details, in priority order, grouped as wrong or lacking, underengineered, over engineered.
5. Priority fixes: only P0 to P2 findings that are `reproduced` or `structural`.
6. Verification coverage: which lenses were applied, which probes ran, and the source and target result of each.
7. Limitations and unresolved questions, briefly.

State "none found" for an empty finding group instead of omitting it. This shows the lens was applied.

Review only: do not modify product code, stage, commit, push, post reviews/comments, or change issue/project state. Local report and isolated probe artifacts are allowed. Return clickable absolute report/probe paths and a short prioritized summary. Point the implementing agent to [debate-issue-review](../debate-issue-review/SKILL.md) for independent assessment. Do not automatically accept or fix findings.
