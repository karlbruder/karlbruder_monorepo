---
name: debate-review
description: Independently challenge issue or branch-based review feedback using requirements, code, and saved probes, then rank which findings deserve action. Use to assess review feedback before fixing it, without assuming either reviewer or implementing agent is correct.
---

# Debate Review

Be skeptical of both the review and the implementation. The goal is a justified decision for the developer, not defending prior code or winning an argument. Correct findings should survive scrutiny; unsupported findings should not become work by default.

## Gather the original evidence

Accept an issue number/URL, `--source <branch>`, `--target <branch>`, optional plan/repository/model label, and one or more review report paths or supplied review text.

- Issue mode is the usual workflow: locate reports for the specified issue and use its requirements as context. Resolve the branch pair from the selected report, then verify it against the current refs and any available implementation plan. If these disagree, ask which comparison is intended. A saved plan is optional.
- Branch mode is selected when `--source` or `--target` is supplied. Explicit refs take precedence over issue/plan refs. Default an omitted source to the current branch and an omitted target to `master` in this repository (the verified repository default elsewhere). No issue or plan is required. A supplied issue remains supplemental context; store this run under the branch-pair namespace.
- If only a report is supplied, use its recorded mode and refs/issue when unambiguous. Do not guess missing branch refs or issue identity. Resolve the repository and verify selected refs before assessing code.

Use an explicitly supplied report first. Otherwise locate matching reports under `.local/review-issue/issue-<number>/` or `.local/review-issue/<target>__<source>/` for the chosen mode. For older reports stored with source-first namespaces, accept an explicit report path and verify its recorded refs; do not rename or overwrite historical reports. If several candidate reports leave the intended review ambiguous, ask which to debate; if none exists, ask for the review text/path rather than inventing findings. Branch refs alone establish scope but do not replace the feedback to be debated. If a supplied report concerns another branch pair, ask before applying it; changed SHAs on the same pair are handled as stale evidence below.

Read every finding, applicable AGENTS.md, relevant code/spec excerpts, and the issue/plan only when available and relevant. Without an issue, assess documented behavior and the actual diff instead of manufacturing ticket requirements. Do not read all specs indiscriminately.

Examples: `$debate-review 123` or `$debate-review --source feature/payments --target master <review-path>`.

Record the selected source and target names/SHAs and merge-base, the original review's source/target/merge-base SHAs, and the working-tree state. Inspect the selected source revision, not an unrelated checked-out branch; uncommitted changes are outside this comparison. Verify whether the review still applies. If code has changed, evaluate historical correctness separately from whether action is still needed now. Do not dismiss a valid historical finding simply because it was fixed later.

Preserve original finding IDs; namespace IDs by report when combining reviews. If feedback has no IDs, assign IDs and retain the original wording/locator. Include every finding in the final disposition, merging duplicates only with links to their originals.

## Challenge each finding

For each claim:

1. Restate the claimed failure and expected behavior fairly. Identify its requirement and scope basis.
2. Trace the actual call path and constraints. Check whether the trigger is reachable, whether a guard already handles it, and whether the claimed impact follows.
3. Inspect and, when safe and useful, rerun the reviewer's saved probe using [the shared evidence rules](../review-issue/references/evidence.md). Check fixture realism, mocks, environment, revision, and whether the assertion encodes the agreed requirement. A test failure alone does not settle the claim.
4. If needed, save a counter-probe or corrected reproducer in this debate run. Preserve the original probe unchanged. Record both supporting and contradicting evidence and reproducible results.
5. Separate correctness, relevance to this issue, severity, and recommended timing. Do not classify a current regression or acceptance failure as future work just because another ticket sounds related. Cite the actual deferred-scope decision/ticket; otherwise ask the developer.

A missing test is not automatically a defect, and a passing suite is not proof the reviewer is wrong. Lack of reproduction is inconclusive unless the scenario is actually disproved. Ask about unresolved product decisions; do not fill them with the implementing agent's preference.

## Honest exchange with the reviewer

When the reviewer is available and communication is authorized, send specific disputed claims, code/probe evidence, and focused questions; consider the response and revise conclusions when warranted. Do not send messages to another chat or external service without human authorization. Do not create a second agent or pretend to have consulted the reviewer merely because this skill is called debate-review.

If direct exchange is unavailable, perform the independent assessment and save a concise reviewer-question packet for the developer to pass along. Label unanswered challenges and material disagreements unresolved. Stop exchanging once evidence establishes a conclusion or further progress requires a developer decision; do not argue indefinitely or force consensus.

## Persist the decision report

Save a new run under the namespace for the selected mode:

- Issue mode: `.local/debate-review/issue-<number>/debate-<N>__<model>/`
- Branch mode: `.local/debate-review/<target>__<source>/debate-<N>__<model>/`

For example, `--source feature/payments --target master` uses `.local/debate-review/master__feature-payments/debate-1__sol/`. Each run contains `debate.md` and `probes/` when needed. Use the exact branch namespace selected by review-issue when debating its report, after verifying the original refs. For supplied review text without a stored namespace, follow review-issue's sanitization and collision handling. Preserve original refs in the report. Sanitize the actual or developer-supplied model label; ask if unavailable. Allocate N without overwriting another run. Keep the original review and evidence intact. Follow the shared evidence rules for every counter-probe and output.

Record mode (issue or branches), original branch names, issue URL and plan path when available, and original report paths, reviewed/current SHAs, date, model, verification limitations, and whether direct reviewer exchange happened. Include a concise summary and this prioritized table:

| Finding | Verdict | Scope | Priority | Evidence and rationale | Recommended action |
| --- | --- | --- | --- | --- | --- |
| [original ID + short claim] | [assessment] | [relationship to issue or branch change] | [P0–P3 or none] | [code/probe/result links] | [fix now, defer, no change, or clarify] |

Verdicts: confirmed, partially confirmed, disproved, unresolved, or already addressed. Scope: current issue/branch change, pre-existing, explicitly deferred (with reference), or optional preference. Use P0 immediate critical blocker, P1 serious pre-merge issue, P2 material normal-priority issue, P3 optional improvement/nit. Explain severity changes from the original review. Do not assign a blocking priority to an unproven hypothesis as if it were confirmed; state the potential impact and needed evidence separately.

Order the table by recommended action and impact. Below it, give details only where needed to reproduce evidence or understand disagreement. List remaining developer decisions, reviewer questions, and suggested fix boundaries. A canvas may supplement the table, but the Markdown report must remain complete and accessible without chat history.

Return the report path, which findings merit action, which do not, and what remains uncertain. Do not edit application code, stage/commit, publish review comments, create future tickets, or change the issue automatically. Once the developer chooses fixes, hand them to implement-issue when an issue plan exists, with the same human review/commit checkpoints, and record approved changes there. For branch-only work without a plan, report the proposed fix scope directly to the developer without requiring issue creation or planning; do not erase original review history or mark unresolved work ready for PR.
