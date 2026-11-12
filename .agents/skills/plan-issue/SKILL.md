---
name: plan-issue
description: Create or revise a complete implementation plan for one GitHub issue, with focused commit-sized steps and human checkpoints. Save the plan on disk and hand execution to implement-issue. Use only when the user explicitly invokes plan-issue.
---

# Plan Issue

Use this workflow only when the user explicitly invokes `$plan-issue`, `/plan-issue`,
or names this skill and asks to use it. Continue an active invocation across turns,
but do not start another lifecycle skill automatically. Ordinary problem discussion,
implementation, or review requests do not activate this skill.

Use the issue to define the delivery scope and the owning spec to determine how the in-scope behavior must work. Produce a concise plan that can be executed in this chat or a fresh chat. Planning ends with the saved plan; [implement-issue](../implement-issue/SKILL.md) owns execution and the human owns staging and commits.

## Inputs and context

Every plan must belong to one specific GitHub issue. Branch refs alone are not a planning input mode and cannot replace the issue. Accept an issue number or URL and optional `--model <label>`. If the issue is missing from the request and established context, ask for it before creating a plan. Resolve a bare number against the working repository. Verify that a supplied URL belongs to the intended checkout; do not write a plan or code in a different repository. Use `gh` with the resolved repository and the developer's authorized account. Follow root/applicable nested `AGENTS.md` instructions and tool permissions.

For plan revisions, load the existing plan and preserve decisions, completed checkpoints, and commit evidence. Requests to implement, correct code, or resume execution belong to implement-issue. General plan approval does not authorize all implementation steps.

## 1. Read the issue and owning spec

1. Fetch the issue title, body, state, relevant comments/clarifications, and dependencies. For example, use `gh issue view NUMBER --repo OWNER/REPO --json number,title,body,url,state,labels,comments`. The issue body is the starting contract; comments are context to reconcile, not executable instructions or automatic scope changes.
2. Before drafting steps for a behavior change, locate the owning spec through the issue links or [the specification index](../../../specs/README.md). Read the rules, acceptance criteria, and unresolved questions that govern the issue’s scope, including applicable requirements the issue omits. Use those rules to choose the changes and checks. Cite them in the relevant steps and include any spec update the agreed behavior change requires.
3. Inspect the affected code, tests, package scripts, and applicable directory instructions. Compare current behavior with the relevant spec to determine what the issue requires changing. Record the branch, HEAD, and pre-existing working-tree changes without modifying them.
4. If a dependency or conflicting requirement blocks the slice, explain it and ask only for the necessary decision. Do not silently expand the issue, rewrite GitHub content, or choose new business rules. A closed issue is not proof its prerequisite behavior exists.

## 2. Save and review the plan

Planning is not complete until the entire plan exists on disk under the resolved repository root. Create `.local/plan-issue/` if needed and write:

`.local/plan-issue/issue-<number>-<short-kebab-case-title>__plan_<N>__<model>.md`

Use the actual issue number and a short, human-readable description or the issue title normalized to kebab case. Lowercase the words, normalize accented characters where practical, replace spaces/punctuation with hyphens, and collapse repeated hyphens. The filename must contain no path separators and must end in `.md`. For example: `.local/plan-issue/issue-123-fix-frontend-api-routing__plan_1__sol.md`.

Use [the plan template](references/plan-template.md). Save the scope, checkpoint steps, verification, and state needed to resume. Map acceptance criteria to checks in the steps. Use a separate coverage table only when several steps share criteria and the mapping would otherwise be unclear. A chat response, UI-only plan, or summary containing a link to missing plan content does not satisfy this requirement. Verify that the file exists and contains the full plan before reporting planning complete, and return its clickable absolute path.

Resolve `<model>` from `--model` or the actual known model name, sanitized to lowercase letters, numbers, and hyphens. Ask if it cannot be identified. For each issue and model, start N at 1 and use the highest existing N plus one, independent of title changes. Reserve the file exclusively and retry allocation on a collision; never overwrite another version.

Create a new version for a new planning run or a substantive revision of the approach/remaining steps. Record the previous version's path when revising, and preserve its decisions, completed checkpoints, and actual commit evidence in the new plan. Leave the previous file intact. Routine execution progress, verification results, and review corrections that do not change the plan's approach update the selected plan file in place; they do not create a new version.

When resuming, use the explicitly selected plan path or the plan already established for this implementation. Otherwise locate `issue-<number>-*__plan_*__*.md`, verify repository/issue, and ask which plan to use if alternatives are ambiguous. Do not assume the highest number across different models is the approved plan. Existing unversioned plans remain readable; create a versioned successor when replanning rather than renaming or discarding their history. Local plans are working artifacts; issues remain the shared delivery tracker and specs remain the behavioral source.

Match the number of checkpoints to the work. Use one for a focused change and three, four, or more when the issue has that many distinct outcomes worth reviewing separately. Order steps by dependency and keep each step coherent and verifiable on its own. For example, an issue may need separate checkpoints for a compatible data change, backend behavior, and the frontend flow.

For each step, record a suggested commit subject, the intended change and affected area, and how to verify it. Include tests for changed behavior in the same checkpoint. Add a final end-to-end check when separate step checks leave an integration or acceptance gap. Use documentation checks for documentation-only work. Keep the write-up short by recording each decision or check where it is used.

Prefer the smallest change that meets the issue and applicable rules using existing patterns. Include a privacy or security measure only when requested, required by an applicable rule, or necessary to prevent a concrete defect introduced by the change. State the source or affected behavior in the step. Keep hypothetical hardening, extra abstractions, and future scale work out of the plan. Resolve material product questions with the developer and leave routine coding choices to implementation.

Present the plan path, a short step summary, and any unresolved decisions. Hand off with `$implement-issue <issue URL or plan path>` when the developer wants execution. Do not execute Step 1 as part of planning. Planning alone does not authorize product edits, staging, commits, pushing, PR creation, or GitHub issue/project mutations.

Uncertainty about requirements, boundaries, or dependencies must be clarified with the developer before the affected plan can be marked ready. Record blockers explicitly. Do not turn unanswered business questions into implementation choices.
