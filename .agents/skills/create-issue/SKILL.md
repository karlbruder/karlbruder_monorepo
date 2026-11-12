---
name: create-issue
description: Clarify a developer's requested change and create one self-contained GitHub issue with a short task checklist and verifiable acceptance criteria. Use to scope and create a delivery issue, not to plan commit checkpoints or open a PR. Use only when the user explicitly invokes create-issue.
---

# Create Issue

Use this workflow only when the user explicitly invokes `$create-issue`, `/create-issue`,
or names this skill and asks to use it. Continue an active invocation across turns,
but do not start another lifecycle skill automatically. Ordinary problem discussion,
implementation, or review requests do not activate this skill.

Turn one agreed piece of work into a clear, junior-friendly issue for one focused PR. The issue is a complete implementation brief for that slice, not a copy of an entire spec.

## Inputs and boundaries

This skill creates a GitHub issue; it has no branch-comparison mode and does not require an existing issue number. Accept a description of the work, optionally a spec path, rule IDs, related issue, repository, or project. Resolve the working repository from explicit input and Git evidence. If the intended repository is unclear, ask rather than selecting one by guesswork.

Use GitHub CLI (`gh`) with the resolved repository on every repository command. Use the developer's authorized account; never assume a named person's identity or switch accounts automatically. Follow root and applicable nested `AGENTS.md` instructions and tool permissions.

Read context and prepare a local draft without implementing code, staging, committing, pushing, opening a PR, or changing specs to fit the ticket. Preview the complete issue and board action before publication approval. Do not post comments or change other issues.

## 1. Research and clarify the delivery contract

1. Read the developer's request. Use `specs/README.md` to locate only the relevant rules, acceptance criteria, and decisions. Inspect affected code to establish the actual starting point. Consult `specs/open-questions.md` for choices affecting this slice, not unrelated future capabilities.
2. Search related open and closed issues for duplicates, prerequisites, and context. If an issue already covers the same slice, show it and ask whether to use it or whether the requested work is distinct. Do not create a duplicate automatically. An issue's closed state does not prove its acceptance criteria are implemented, and historical issue text must not override the current agreed specs.
3. Verify available labels and the intended GitHub Project. If access fails, state what could not be checked. Do not present an unverified dependency, label, project, or implementation claim as established fact.
4. Whenever scope, requirements, dependencies, an integration boundary, expected behavior, or the next action is uncertain, stop the work that depends on that answer and ask the developer. Do not infer a requirement to make the issue appear complete. Use the clarification rules below, then incorporate the answers and reassess the slice.
5. Define one observable outcome with explicit included and excluded work. If the request is too broad for one focused PR, propose concrete smaller slices and their dependencies. Ask which slice to create first; do not choose for the developer or create a batch without their direction.

### Clarification rules

Ask as soon as a doubt becomes apparent, not only after drafting the whole issue. Explain the missing decision and its effect, with concrete choices or an example when useful. Group related questions into a short exchange, then follow up if an answer creates another ambiguity.

Typical questions include whether a registration task covers only the API or also its UI, whether an existing prerequisite must be extended in this issue or delivered separately, and what an unspecified failure outcome should be. Ask only about uncertainty in the actual task, not every conceivable future case.

- Look up factual details in available code/specs first. If they remain unclear, ask instead of guessing endpoint paths, field names, validation rules, ownership, payment policy, or dependency completion.
- Distinguish a choice explicitly delegated to the implementer from a missing requirement. Preserve delegated freedom and its constraints; do not invent a fixed design or require the developer to decide every internal function name.
- Continue independent research if useful, but do not finalize dependent task text while its required decision is unanswered. Silence or elapsed time is not an answer.
- If the request and specs conflict, show the conflict and ask which behavior is intended. Record any approved spec correction in the issue scope instead of silently treating either source as current.
- Capture each resolved answer where a developer needs it. The issue must not depend on the developer having read this chat.
- Do not publish an implementation-ready issue with unresolved scope questions, guessed requirements, alternatives the developer has not chosen, or placeholders such as "decide later" for required behavior. Keep a draft and identify the unanswered questions instead. Do not turn an unresolved product decision into an implementation checkbox that hides the ambiguity.

## 2. Write the issue

Use [the issue template](references/issue-template.md). Start with the outcome and the minimum context a developer needs. List cohesive tasks and observable acceptance checks. Mention constraints, exclusions, dependencies, and spec references only when they affect delivery. Put each detail where it helps the reader and avoid repeating it across sections.

Include privacy or security requirements when the agreed scope or an applicable rule calls for them, or when the change would otherwise introduce a concrete access or data-handling defect. Describe the relevant behavior and cite its source when applicable. Leave generic hardening and routine implementation choices out of the ticket.

## 3. Check clarity, preview, and publish

Before presenting the final draft, check that a developer without this chat can identify the outcome, boundaries, prerequisites, concrete work, and how to prove completion. Resolve contradictions and unanswered requirements with the developer before proceeding. Every required acceptance result must be supported by the scoped tasks, and every task must serve the agreed outcome.

1. Save the exact proposed Markdown body to a temporary file. Show the title, full body, existing labels, dependencies, and target project. Ask for approval of this concrete issue and board action. If already approved unchanged, do not ask again. Leave assignee/milestone unset unless requested, and use the project's default state unless another verified state was requested.
2. Publish with `gh issue create`, passing the file with `--body-file`; do not interpolate issue prose into shell code. Capture the returned issue URL immediately.
3. Add it to the agreed project with `gh project item-add` if not already present. Do not invent project IDs or Status values. If project access is unavailable, keep the created issue and report the missing board action.
4. Verify the issue body, labels, and project membership through read-only retrieval. After an ambiguous timeout, check for the exact issue/item before retrying. Never create a second issue to recover from uncertain success or failed project attachment. If success cannot be established, report the uncertainty and stop mutation retries.
5. Return the issue link, spec coverage, and any dependency or project-access limitation. Suggest `$plan-issue <issue URL>` (or `/plan-issue` in Claude Code). Do not start planning or implementation automatically.

If publishing is unavailable, not approved, or blocked by unanswered requirements, return the local draft path with the limitation and distinguish it from a created GitHub issue.
