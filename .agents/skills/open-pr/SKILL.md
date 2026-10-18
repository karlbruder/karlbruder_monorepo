---
name: open-pr
description: Publish a branch and open a GitHub pull request with a reviewer-focused description based on its actual diff. Accept an optional issue, --source, and --target; no saved plan is required. Never stage, commit, or merge.
---

# Open PR

Open a PR after [implement-issue](../implement-issue/SKILL.md) or for other committed development work. An issue and saved plan are optional context, not prerequisites. Create the PR with its finished description in the initial body. Follow [the description guide](references/pr-description.md), adapted from the team's PR Write Description style and bundled here so every developer can use it.

## Resolve and verify

Accept an optional issue number/URL, `--source <branch>`, `--target <branch>`, repository, optional plan path, and `--test-plan` (default off). The usual issue workflow supplies an issue number. Without one, work directly from the selected branches; do not require an issue or invent one.

Resolve the repository before Git operations. Default source is the current branch and default target is `master` for this project. Explicit `--source` and `--target` always override those defaults, including when an issue or plan is supplied. When deliberately used in another repository, use that repository's verified default branch if no target is supplied. Verify both refs; if a ref is absent or the current checkout is detached without an explicit source branch, ask for the needed ref. Do not silently substitute a different target.

Examples:

- `$open-pr 123` — current branch against master, with issue context.
- `$open-pr --source feature/payments --target master` — branch diff without an issue or plan.
- `$open-pr --target release --test-plan` — current branch against release.

Read applicable AGENTS.md, Git status, selected refs, and actual commits. Read the issue if supplied. Use a relevant saved plan only when available and unambiguous; if absent, proceed from the diff without asking for a plan or sending the developer to planning. If a plan is available, it supplies useful requirements and check results, but stale local status fields do not override actual code/commit evidence. No workflow status or GitHub label is required to open a PR.

Never stage, commit, amend, or silently include working-tree edits. Unrelated uncommitted files may remain; if intended PR changes are uncommitted, stop for the human to commit them.

Inspect the full three-dot diff and commits (`git diff target...source`, `git log target..source`), reading changed files as needed. Resolve current remote target evidence using read-only retrieval/fetch when necessary, without merging or rebasing. Stop on an empty diff. Surface unrelated commits, unmet acceptance criteria, or conflicting scope before publication. Describe only verified changes; do not copy claims from the plan that the diff does not support.

If review/debate reports or tech-lead decisions are supplied or referenced in the active plan, check that agreed fixes are reflected in the final diff and unresolved decisions are surfaced. Do not require a review report for standalone PR work, or treat every reviewer suggestion as mandatory.

Reuse recorded checks when still applicable to the final head; run necessary remaining checks, and distinguish executed results from suggested manual verification. Do not invent successful tests. If required verification is blocked, return the blocker rather than declaring the issue ready.

## Prepare the publication

Build a concise outcome-focused PR title and the complete body using the description guide. Respect an applicable repository PR template's required fields while preserving that writing style. When an issue is supplied, include a closing reference only if the PR fulfills its entire scope. For an intentional partial delivery, use a non-closing reference and describe the remaining scope. If no issue was supplied or verified, omit the issue reference; do not require a ticket to publish the PR. Closing keywords close the issue when the PR merges into the repository's default branch (`master` here), not on PR creation. For another target, state that issue closure will need follow-up.

Save the exact body to a temporary Markdown file and preview the title, body, source, target, destination repository, and branch publication. Obtain approval of that concrete publication unless the developer already authorized it with these details established. Do not re-request an unchanged approval. A request to implement alone is not authorization to publish.

## Publish and create

Use the developer's authorized GitHub account and explicit repository. Invoking this skill to open the PR includes publishing the selected committed branch once the concrete publication is approved. Push only that branch to the verified intended remote, without force or tags. If the remote branch diverged, stop and ask; do not rebase or overwrite it.

Before creating, check for an existing PR for this repository, source, and target. If an open PR already exists, reuse its URL; update its body only when the developer authorizes that update. Apply the In Review synchronization below only after verifying the intended commits are published to that PR. If a prior PR is closed or merged, clarify whether this work needs a new PR rather than reopening or duplicating automatically.

Map source to GitHub head/compare and target to base. Create with explicit head/base and `gh pr create --body-file PATH`, supplying the prepared title. Create a normal PR unless the developer requested a draft. Submit raw Markdown as the body, without a surrounding copy/paste fence. If pushing or creation times out, inspect remote state and existing PRs before retrying; stop if success cannot be established. Do not create duplicate PRs.

Verify the returned PR's repository, source, target, head SHA, title, and body. Where the host provides a PR attachment tool, attach the created PR to the current chat. If a relevant plan was used, record the PR URL and published head SHA there only after creation is confirmed. Without a plan, return the verified PR URL without creating a plan just to store it. If branch publication succeeds but creation fails, report that partial result and retain the prepared body for retry.

## Move the issue to In Review

After PR creation and published head verification succeed, move the supplied or explicitly associated issue's linked GitHub Project item to **In Review**, following [Project status updates](../implement-issue/references/project-status.md). This covers both To Do (a PR opened without the implementation workflow) and In Progress. Invoking open-pr authorizes this status change along with PR publication; preview the intended Project/status with the PR details without requiring another confirmation for the same approved action.

If the verified existing PR already contains the intended work, synchronize its issue item the same way; an item already In Review needs no update. Do not change status on a failed push, unconfirmed PR creation, or an existing PR with unpublished intended changes. Branch-only work without an associated issue has no issue Project update. Never infer an issue solely from a branch name or update unrelated PR Project items.

Return the PR link, verified Project status (or update limitation), and a brief verification summary. Hand off approval and merge to the tech lead. For requested changes, the developer returns to implementation with tests and human commits; publishing additional commits or updating an existing PR requires their instruction. After merge, the developer verifies issue closure and updates the GitHub Project if its automation has not done so. Do not merge, directly close the issue, post extra comments, assign reviewers, or make Project status changes beyond the In Review transition above unless separately requested. Report checks still running as pending, not passed.
