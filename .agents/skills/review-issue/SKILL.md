---
name: review-issue
description: Review an issue implementation or explicit source/target branch diff adversarially, saving prioritized findings and runnable probes for independent debate. Use for issue or branch review, not implementation or automatic fixes.
---

# Review Issue

Adapt the adversarial review approach to the issue's actual delivery scope. Understand intent first, then challenge correctness, missing engineering, and unnecessary complexity. A review is evidence to evaluate, not an instruction to implement every suggestion.

## Establish the review boundary

Accept an issue number/URL, optional plan path, `--source <branch>`, `--target <branch>`, repository, and optional model label. Resolve the repository before Git operations.

- Issue mode: use the issue as context and verified source/base information from an available plan. A plan is optional; otherwise default to the current branch against `master` in this repository (the verified default branch in another repository).
- Branch mode: supplying `--source` or `--target` selects a branch-based review. Explicit refs override plan/issue-derived refs. For an omitted source use the current branch; for an omitted target use `master` here. No issue or plan is required. If an issue is also supplied, it is supplemental context and does not change the branch-based storage namespace.
- If neither an issue nor branch arguments are supplied or established in context, ask which issue or branch comparison to review. Verify refs and ask about ambiguity or missing refs rather than substituting another branch.

Read the supplied issue and relevant clarifications when available, the selected plan when relevant, applicable AGENTS.md, and changed code with enough context to understand behavior. In branch mode, establish intent from the actual diff, commits, and documented behavior; do not invent issue requirements or require a ticket. Consult only relevant spec excerpts needed to resolve requirements or invariants. Ask about unclear product intent or conflicting requirements.

Examples: `$review-issue 123` or `$review-issue --source feature/payments --target master`.

Verify refs and record source SHA, target SHA, merge-base SHA, branch names, date, repository, mode (issue or branches), optional issue URL, model label, and working-tree status. Review the pinned three-dot diff (`target...source`) and relevant commits. An empty diff means stop and report no changes to review. Uncommitted files are outside this branch review; report them and avoid treating their contents as the pinned source. Use a disposable isolated checkout if necessary to inspect or execute the exact revision without switching or disturbing the developer's work.

## Review critically and proportionately

State the intended outcome and any established acceptance criteria before judging implementation. Evaluate the complete scoped change, including authorization, failure behavior, integrations, tests, and documentation where relevant. Trace behavior beyond changed hunks when necessary to prove impact.

For each actionable finding, identify a concrete trigger, expected requirement, observed behavior, affected file/symbol and line at the reviewed SHA, practical impact, and evidence. Distinguish introduced defects from pre-existing limitations and work explicitly deferred by the issue/specs. A closed ticket is not proof its behavior exists. Do not declare something deferred without a verified reference or developer confirmation; future scope does not excuse a current acceptance failure.

Separate defects from preference, unnecessary abstraction, speculative hardening, and missing engineering that actually matters to this issue. Do not invent findings to fill sections. Tests or probes are useful when they resolve uncertainty; a sound static argument can suffice. A failing probe is not proof until its setup, assumptions, and expected result are justified.

Assign stable IDs `R1`, `R2`, etc. Use priorities: P0 immediate critical harm/blocker, P1 serious issue to fix before merge, P2 material normal-priority issue, P3 optional improvement/nit. Explain priority from impact and likelihood, not reviewer confidence. Record confidence and scope separately. Flag unverified suspicions as unresolved, not confirmed defects.

## Save the review and evidence

Follow [evidence and probe rules](references/evidence.md). Save each run under:

- Issue mode: `.local/review-issue/issue-<number>/<target>__<source>__review-<N>__<model>/`
- Branch mode: `.local/review-issue/<target>__<source>/review-<N>__<model>/`

For example, `--source feature/payments --target master` uses `.local/review-issue/master__feature-payments/review-1__sol/`.

Sanitize branch labels by replacing `/` and other path-unsafe characters with `-`, retaining the original refs in report metadata. Use `<target>__<source>` as the branch namespace, matching GitHub base (target) then compare (source). New runs use this order; preserve older source-first reports without renaming them. If distinct refs map to a namespace already used by another pair, append the first 8 hexadecimal characters of SHA-256 of the UTF-8 string `target + \0 + source` (original refs separated by a NUL byte), and verify the stored pair before reusing it. Record the selected namespace in the report so debate-review uses the same folder name. Use the same namespace calculation in both skills. Use sanitized model labels. Use a supplied model label or the actual known model; ask if unavailable rather than inventing it. Allocate the next free N for this branch pair and model, creating the directory exclusively and retrying on collision. Never overwrite an earlier run. Save `review.md` and any `probes/` files inside that run.

The report begins with the recorded boundary metadata and uses these headings from the original review approach:

- Intent
- What was done right
- What is wrong or lacking
- What is underengineered
- What is over engineered
- Priority fixes

Keep empty finding categories brief and honest. In issue mode, include an acceptance-coverage summary; in branch mode, summarize the verified behavior and review coverage, without inventing acceptance criteria. In either mode, distinguish verified, failed, and not-verified coverage. Each finding appears once with its ID and evidence; Priority fixes ranks those IDs rather than duplicating the full text. Add `Probes` when applicable, linking every saved reproducer, fixture, command, expected/actual result, and output. Record limitations and questions explicitly.

Review only: do not modify product code, stage, commit, push, post reviews/comments, or change issue/project state. Local report and isolated probe artifacts are allowed. Return clickable absolute report/probe paths and a short prioritized summary. Point the implementing agent to [debate-review](../debate-review/SKILL.md) for independent assessment; do not automatically accept or fix findings.
