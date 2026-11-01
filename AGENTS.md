# Working in the Karlbrüder monorepo

## Directory-specific instructions

- Before working in a directory, check for and read any nested `AGENTS.md` files along the path from the repository root to the files you will change. This includes `backend/`, `frontend/`, `landing/`, and any deeper directories.
- Apply each nested file together with the applicable parent instructions. A child file covers its directory and descendants. It does not cover sibling directories. A nested file adds local rules. It does not copy this file.
- If a child instruction conflicts with this file or another parent, stop the conflicting work and ask which instruction to follow. Name the files and the conflicting lines. Recommend the more specific child file as the override for its scope. Do not apply that override until the user confirms. Continue independent work that the conflict does not affect.
- Honor a conflict resolution the user has already confirmed for the same scope.

## Boundaries

The rules in this file are enough for ordinary work. Open another file only when the task needs a rule that is not already here.

- `landing/` is the public website. `frontend/` and `backend/` are one authenticated application.
- Tournament registration, payment proofs, registration tracking, and results belong in the application.
- The platform supports multiple tournaments. Monomachia is the first major event. Membership and equipment inventory are future work. Do not build them during an unrelated task.
- Guild staff (admins) have full application access across all tournaments. There are no event-specific admin assignments.

Open [product](specs/product.md) when the task crosses the public site, the application, or a future capability such as membership or inventory. Open [architecture](specs/architecture.md) and [decision 0003](specs/decisions/0003-local-and-production-stacks.md) when the task changes how a stack is deployed. Open [local development](specs/platform/local-development.md) when the task changes local Compose, ports, or the local database. Leave those files closed for a change that stays inside one application.

- Run an application's tests with its `compose.test.yml` when that file exists. Pass `-p` with a unique project name when another test stack may be running, then remove that project with `down -v`. Do not replace that run with a host test command.
- Keep the existing local development ports.
- Production domain data lives in Supabase PostgreSQL `public`. Do not add a production PostgreSQL container.

## Specifications and issues

For issue-driven work, start with the issue and follow [Issue workflow](#issue-workflow). When the issue needs a rule that is not in this file, use [the specification index](specs/README.md) to find it. Read the section that applies, and any decision that section links. Leave the index closed when the issue or this file already states the rule.

Read the assigned GitHub issue when its contents are available or access is authorized.

- Specifications describe intended behavior. Issues describe delivery scope, dependencies, and tasks.
- A closed issue is not evidence that every acceptance criterion is implemented.
- The user's latest explicit direction takes precedence over earlier repository documents. Surface conflicts between specifications, issues, and implementation.
- Do not restore a superseded design because an old issue still describes it. Open [decisions](specs/decisions/README.md) when an issue and a spec disagree. Issue #21's landing-site registration form is superseded by [decision 0001](specs/decisions/0001-public-website-and-application.md). Open that decision only when you need the reasoning.

## Issue workflow

The skill file is the procedure. Read it and follow it. This section only says which skill to open.

Create-issue, plan-issue, and implement-issue require a GitHub issue. They have no branch-only mode. Review-issue, debate-review, and open-pr accept an issue number or URL, or `--source` and `--target`. Explicit refs select branch mode.

- New development work without an issue: [create-issue](.agents/skills/create-issue/SKILL.md). Ask when scope, requirements, or boundaries are unclear. Do not infer missing requirements. Preview the issue before publishing.
- An existing issue that needs a plan: [plan-issue](.agents/skills/plan-issue/SKILL.md). Save the plan under `.local/plan-issue/`. A chat summary is not a plan. Planning does not start implementation.
- Implement a saved plan: [implement-issue](.agents/skills/implement-issue/SKILL.md). One authorized checkpoint at a time. Include the tests in that same checkpoint. Never stage, commit, amend, or push. Suggest a commit message and stop for review.
- A requested review: [review-issue](.agents/skills/review-issue/SKILL.md). Findings are claims to verify. They are not instructions to change code.
- Assess review feedback before fixing it: [debate-review](.agents/skills/debate-review/SKILL.md).
- Publish committed work: [open-pr](.agents/skills/open-pr/SKILL.md). Never stage, commit, or merge.

Keep decisions, checkpoint state, commit evidence, and verification in the saved plan so a fresh chat can resume. Ask before each `gh` command, including a read and a Project status change the skill names. A skill does not skip that ask. Do not post a progress comment, close an issue, or merge a pull request unless the user asks.

## Implement and verify

- Follow the relevant rules and acceptance criteria. Cite a rule ID in the test description or in verification notes when that helps a reader find the rule. Do not use the ID as the whole test name.
- Open questions are unresolved decisions. Consult [the open-question index](specs/open-questions.md) before asking for a product decision. Ask about a question that affects the requested behavior, and continue work that does not depend on it. Do not invent the business rule.
- When a requested change alters behavior, update the owning specification in the same change. Keep delivery checklists in the GitHub issue. Keep the implementation plan in `.local/plan-issue/`.
- Report what was verified and which criteria remain unverified. Documentation-only changes need link and consistency checks, not an application test run.

## Docs, specs, and readmes

When you create or edit a file under `docs/`, `specs/`, or a `README.md` file, put these lines directly under the title:

- `**Created**: YYYY-MM-DD`
- `**Last updated**: YYYY-MM-DD`

Set both dates when the file is created. On later edits, change `**Last updated**` to the edit date and leave `**Created**` as it is. These lines are not an ADR header.

Write those files, and code comments, for a person who is skimming. Use short sentences. Start a new sentence when the next idea begins. Join ideas with a comma, a period, or a new paragraph. Do not join two clauses with a semicolon or with a dash.

## Repository conventions

- The backend owns domain rules, authorization, and database access. Frontend visibility checks do not replace backend authorization.
- Supabase Auth owns application identity. Domain objects belong in PostgreSQL `public`. Do not modify Supabase-managed `auth` objects. Open [team access](specs/platform/team-access.md) and [AWS](docs/aws.md) only when the task is how the team signs into AWS. Open a file under [runbooks](docs/runbooks/README.md) only when the task is an operational procedure that file already describes.
- Keep credentials, personal registration data, payment proofs, and private safety notes out of source files and public assets.
- Do not add a comment that only restates the next line. A module docstring is fine. A section separator is fine. A short class or function docstring is fine when it adds something the name does not already say. When a class or function is hard to follow, the docstring may explain the reason and give an example. A comment on a line belongs where the reason is not visible in the code. Settings files and env examples follow the same rule.
- A test function name should say what the check does and what result it locks in. The file name is only the behavior area. When the function name already says both, stop. When it does not, add one short description in plain language. Pytest uses a function docstring. Vitest and Jest put that sentence in the `it` or `test` title, and add a comment only when the title still hides the point.
