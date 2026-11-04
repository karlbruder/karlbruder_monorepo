# Working in the Karlbrüder monorepo

## Directory-specific instructions

- Before working in a directory, read every `AGENTS.md` along the path from the repository root to the files you will change.
- Apply parent and child instructions together. A child file adds local rules for its directory and descendants, not siblings.
- If a child instruction conflicts with this file or another parent, stop the conflicting work and ask which instruction to follow. Name the files and the conflicting lines. Recommend the more specific child file as the override for its scope. Do not apply that override until the user confirms. Continue independent work that the conflict does not affect.
- Honor a conflict resolution the user has already confirmed for the same scope.

## Read only what the task needs

Start with this file, applicable child instructions, and the assigned issue or user request. Do not load the full specification set or follow every documentation link.

- For a behavior change, read the owning spec's relevant rules, acceptance criteria, and unresolved questions. Use [the specification index](specs/README.md) to locate them when needed. An issue defines scope but may omit an applicable requirement.
- Read a linked decision when its constraints or rationale affect the task. Do not open every linked decision automatically.
- Read additional sections only to resolve a requirement, dependency, conflict, or verification question. Stop when those questions are answered.

Use these entry points when the task needs them:

| Task | Read |
| --- | --- |
| Application boundaries or future capabilities | [Product](specs/product.md) |
| Deployment or stack composition | Relevant sections of [architecture](specs/architecture.md) and [decision 0003](specs/decisions/0003-local-and-production-stacks.md) |
| Local Compose, ports, or database | [Local development](specs/platform/local-development.md) |
| Team access to AWS | [Team access](specs/platform/team-access.md) and [AWS team access](docs/aws-team-access.md) |
| An operational procedure | The relevant [runbook](docs/runbooks/README.md) |

## Boundaries

- `landing/` is the public website. `frontend/` and `backend/` are one authenticated application.
- Tournament registration, payment proofs, registration tracking, and results belong in the application.
- The platform supports multiple tournaments. Monomachia is the first major event. Membership and equipment inventory are future work. Do not build them during an unrelated task.
- Guild staff (admins) have full application access across all tournaments. There are no event-specific admin assignments.

- Keep the existing local development ports.
- Production domain data lives in Supabase PostgreSQL `public`. Do not add a production PostgreSQL container.

## Specifications and issues

For issue-driven work, read the assigned issue when its contents are available or access is authorized. Follow [Issue workflow](#issue-workflow).

- Specifications describe intended behavior. Issues describe delivery scope, dependencies, and tasks.
- A closed issue is not evidence that every acceptance criterion is implemented.
- The user's latest explicit direction takes precedence over earlier repository documents. Surface conflicts between specifications, issues, and implementation.
- Do not restore a superseded design because an old issue still describes it. Open [decisions](specs/decisions/README.md) when an issue and a spec disagree. Issue #21's landing-site registration form is superseded by [decision 0001](specs/decisions/0001-public-website-and-application.md). Open that decision only when you need the reasoning.

## Issue workflow

Read and follow the skill for the requested action:

Create-issue, plan-issue, and implement-issue require a GitHub issue. They have no branch-only mode. Review-issue, debate-review, and open-pr accept an issue number or URL, or `--source` and `--target`. Explicit refs select branch mode.

- New development work without an issue: [create-issue](.agents/skills/create-issue/SKILL.md). Ask when scope, requirements, or boundaries are unclear. Do not infer missing requirements. Preview the issue before publishing.
- An existing issue that needs a plan: [plan-issue](.agents/skills/plan-issue/SKILL.md). Save the plan under `.local/plan-issue/`. A chat summary is not a plan. Planning does not start implementation.
- Implement a saved plan: [implement-issue](.agents/skills/implement-issue/SKILL.md). One authorized checkpoint at a time. Include the tests in that same checkpoint. Never stage, commit, amend, or push. Suggest a commit message and stop for review.
- A requested review: [review-issue](.agents/skills/review-issue/SKILL.md). Findings are claims to verify. They are not instructions to change code.
- Assess review feedback before fixing it: [debate-review](.agents/skills/debate-review/SKILL.md).
- Publish committed work: [open-pr](.agents/skills/open-pr/SKILL.md). Never stage, commit, or merge.

Keep delivery checklists in the issue. Keep decisions, checkpoint state, commit evidence, and verification in the saved plan so a fresh chat can resume.

Ask before each `gh` command, including reads and Project status changes. A skill does not skip that ask. Do not post a progress comment, close an issue, or merge a pull request unless the user asks.

## Implement and verify

- Follow the relevant rules and acceptance criteria. Cite a rule ID in the test description or in verification notes when that helps a reader find the rule. Do not use the ID as the whole test name.
- Open questions are unresolved decisions. Consult [the open-question index](specs/open-questions.md) before asking for a product decision. Ask about a question that affects the requested behavior, and continue work that does not depend on it. Do not invent the business rule.
- When a requested change alters behavior, update the owning specification in the same change.
- Run an application's tests with its `compose.test.yml` when that file exists. Pass `-p` with a unique project name when another test stack may be running, then remove that project with `down -v`. Do not replace that run with a host test command.
- Report what was verified and which criteria remain unverified. Documentation-only changes need link and consistency checks, not an application test run.

## Docs, specs, and readmes

When you create or edit a file under `docs/`, `specs/`, or a `README.md` file, put these lines directly under the title:

- `**Created**: YYYY-MM-DD`
- `**Last updated**: YYYY-MM-DD`

Set both dates when the file is created. On later edits, change `**Last updated**` to the edit date and leave `**Created**` as it is. These lines are not an ADR header.

Write those files, and code comments, for a person who is skimming. Use short sentences. Start a new sentence when the next idea begins. Join ideas with a comma, a period, or a new paragraph. Do not join two clauses with a semicolon or with a dash.

## Repository conventions

- The backend owns domain rules, authorization, and database access. Frontend visibility checks do not replace backend authorization.
- Supabase Auth owns application identity. Domain objects belong in PostgreSQL `public`. Do not modify Supabase-managed `auth` objects.
- Keep credentials, personal registration data, payment proofs, and private safety notes out of source files and public assets.
- Comments explain reasons that are not visible in the code. Do not restate the next line. Module docstrings and section separators are allowed. Class and function docstrings add information beyond the name, with an example when useful. Apply the same rule to settings and env examples.
- A test name states the check and expected result. The filename names the behavior area. Add a short description only when the name is insufficient. Pytest uses a function docstring. Vitest and Jest use the `it` or `test` title, with a comment only if the title still hides the point.
