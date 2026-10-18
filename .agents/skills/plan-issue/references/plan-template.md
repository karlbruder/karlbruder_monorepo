# Issue checkpoint plan template

Write the complete populated template to `.local/plan-issue/issue-<number>-<short-kebab-case-title>__plan_<N>__<model>.md` in the repository root. Replace the bracketed guidance and repeat the step section only as needed. The file must contain the entire plan, not just a summary or pointer to chat.

```markdown
# Plan: issue #[number] — [title]

- Issue: [GitHub URL]
- Repository: [owner/repo and local root]
- Plan version / model: [N and model slug]
- Previous plan: [path or none]
- Planning branch / starting HEAD: [branch and commit]
- Implementation branch / base / starting HEAD: not selected yet
- Next action: review plan, then invoke implement-issue
- Issue captured: [timestamp and relevant clarification links]
- Status: awaiting_plan_approval
- Active step: none
- Commit owner: human; agent never stages or commits
- Project URL / issue item: [if known, otherwise resolve when starting work]
- Project status / last sync result: not checked
- Pre-existing changes: [files/areas and ownership boundaries]

## Scope

[Concrete outcome, dependencies, and non-goals.]

## Requirement sources

[Issue sections used. Only list extra spec paths, IDs, revisions, and reasons actually needed; otherwise state no supplemental spec reads were needed.]

## Acceptance coverage

| Issue criterion | Step(s) | Verification |
| --- | --- | --- |
| [Criterion] | [Step] | [Check] |

## Steps

### Step 1: [suggested conventional commit subject]

- Status: planned
- Starting HEAD: not started
- Outcome: [one cohesive result]
- Changes: [specific changes and files/areas]
- Approach: [implementation details, contracts, and relevant failure handling]
- Depends on: [none or earlier steps]
- Done when: [observable result]
- Tests in this commit: [tests added/updated for this step, or why not applicable]
- Validation: [commands/manual checks and expected result]
- Review: [what the human should inspect before staging/committing]
- Results: not run
- Actual commit: none

## Decisions and corrections

[Record later approved changes without erasing earlier decisions.]

## PR handoff

Not ready. implement-issue records every reviewed human commit and required verification here before setting the top-level Status field to ready_for_pr. This is local Markdown state, not a GitHub label or Project status. If this plan is used by open-pr, it records the confirmed PR URL and published head SHA here.

- PR URL: none
- Published head: none
```
