# Working in the Karlbrüder monorepo

## Directory-specific instructions

- Before working in a directory, check for and read any nested `AGENTS.md` files along the path from the repository root to the files you will change. This includes application directories such as `backend/`, `frontend/`, and `landing/`, and any deeper directories.
- Apply each nested file's guidelines to code in its directory and descendants, together with the applicable parent instructions. A child file does not govern sibling directories.
- If child instructions contradict this root file or another applicable parent file, pause the conflicting work and ask the user to confirm which instruction to follow. Identify the conflicting instructions and their file paths, and recommend using the more specific child `AGENTS.md` as the override for its scope. Do not apply that override until the user confirms; continue independent work that is unaffected by the conflict.
- Honor a conflict resolution the user has already confirmed for the same scope rather than asking again.

## Product boundaries

- `landing/` is the public website for discovery, group presentation, and links to events and the application.
- `frontend/` and `backend/` form one authenticated application. Tournament registration, payment proofs, registration tracking, and results belong here.
- The platform supports multiple tournaments. Monomachia is the first major event. Association membership and equipment inventory are future capabilities.
- Guild staff (admins) have full application access across all tournaments. There are no event-specific admin assignments. Preserve the existing regular-user and guild-member boundaries.

## Environment boundaries

- Local `compose.yml` runs frontend, backend, and domain PostgreSQL. The backend source tree is bind-mounted and Uvicorn reloads on change. Authentication still uses hosted Supabase. Add Ministack for local S3 emulation when file storage is implemented.
- `compose.test.yml` runs backend tests with a private PostgreSQL service and publishes no host ports. Agents use this file for tests. Pass `-p` with a unique project name when another test stack may be running, then remove that project with `down -v`.
- Production `compose.prod.yml` runs separate Nginx, frontend, and backend services. Nginx terminates TLS with a self-signed certificate, preserves `/api` when forwarding to the backend, and sends other application requests to the frontend. Only Nginx publishes a host port, 443. Production domain data lives in Supabase PostgreSQL's `public` schema; there is no PostgreSQL container.
- Cloudflare manages DNS and public TLS, proxying the application A record to the EC2 Elastic IP. HTTP redirects to HTTPS at Cloudflare. The self-signed Nginx origin publishes 443 only; frontend/backend ports stay internal. Keep existing local development ports. Local SMTP configuration is deferred, likely real SES with real credentials.
- Private production files use Amazon S3. Application email uses AWS SES via SMTP. See [architecture](specs/architecture.md) and [decision 0003](specs/decisions/0003-local-and-production-stacks.md) for intended stacks and implementation gaps.

## Read the relevant specifications

For issue-driven work, start with the issue and follow the workflow below. Use [the specification index](specs/README.md) to locate rules when the issue needs clarification; read only relevant sections and linked decisions. For work without an issue, consult the relevant specifications before changing behavior. Read [the product overview](specs/product.md) and [architecture](specs/architecture.md) when the task crosses application or domain boundaries.

Read the assigned GitHub issue when its contents are available or access is authorized. Specifications describe intended behavior. Issues describe delivery scope, dependencies, and tasks. A closed issue is not evidence that every acceptance criterion is implemented.

The user's latest explicit direction takes precedence over earlier repository documents. Surface conflicts between specifications, issues, and implementation. Do not restore a superseded design just because an old issue describes it. In particular, issue #21's landing-site registration form is superseded by authenticated registration in `frontend/`.

## Issue-driven development

Create-issue creates a GitHub issue; plan-issue and implement-issue require one. These three skills have no branch-only mode. Review-issue, debate-review, and open-pr accept an issue number/URL or direct source/target branches. Implement-issue creates or resumes the issue branch and develops its saved plan, including tests in each relevant commit checkpoint.

- For new development work without an existing issue, use [create-issue](.agents/skills/create-issue/SKILL.md) to clarify one focused delivery slice from the relevant specs. Ask the developer whenever scope, requirements, or boundaries are unclear; do not infer missing requirements. Write a self-contained issue with detailed progress checkboxes, then preview the concrete issue and project action before publishing.
- For an existing issue, use [plan-issue](.agents/skills/plan-issue/SKILL.md). Start with the issue's requirements and consult specs only where needed. Persist the complete implementation approach in `.local/plan-issue/issue-<number>-<short-kebab-case-title>__plan_<N>__<model>.md`. Prefer the smallest number of cohesive, scoped commit steps without a fixed step limit. Include tests in the same step and commit as the behavior they cover; never defer them to a final testing step. A chat summary is not a substitute for the saved plan.
- Use [implement-issue](.agents/skills/implement-issue/SKILL.md) to create or resume the local issue branch and implement one authorized step at a time. When authorized work starts, set the linked issue Project item to In Progress. Validate each step, suggest a conventional commit message, and stop for human review and corrections. Never stage or commit. The human chooses the message, stages, and commits; verify that checkpoint and obtain permission before starting the next step.
- Keep decisions, checkpoint state, commit evidence, and verification in the local issue plan so execution can resume in a fresh chat. Planning does not automatically start implementation, and implementation does not automatically publish work.
- Use [review-issue](.agents/skills/review-issue/SKILL.md) when an issue or branch review is requested. Both review skills accept `--source` and `--target`; explicit refs select branch mode and take precedence over issue/plan refs. Store branch-based runs under `<target>__<source>` instead of `issue-<number>`, using sanitized branch names. Save findings and runnable probes under `.local/review-issue/`. Use [debate-review](.agents/skills/debate-review/SKILL.md) to independently assess feedback, preserve counter-probes under `.local/debate-review/`, and prioritize justified fixes. Review findings are claims to verify, not automatic instructions to change code. Developer-approved fixes return to the implementation checkpoints.
- Use [open-pr](.agents/skills/open-pr/SKILL.md) when requested to publish committed work and create a PR based on the actual diff. It accepts an optional issue and `--source`/`--target`, defaults to the current branch against `master` here, and also works without a saved plan. After confirmed PR publication, set the associated issue Project item to In Review. These two status transitions are part of their skills; resolve the intended Project and verify the update, reporting failures. Do not automatically post progress comments, make other board changes, directly close issues, or merge PRs.

## Implement and verify

- Follow the relevant rules and acceptance criteria. Cite their IDs in meaningful tests or verification notes where useful.
- Open questions are unresolved decisions, not permission to invent business rules. Ask about questions that affect the requested behavior while continuing independent work.
- Consult [the open-question index](specs/open-questions.md) before asking for a product decision. Define each question once in its owning spec, link to it from related specs, and keep current-scope, deferred, and technical implementation topics distinct. Fold answers into every affected spec and update the index. Do not re-ask resolved choices or require all questions to be answered before independent work can proceed.
- Future scope does not authorize implementing that capability during an unrelated task.
- Update the relevant specification when the requested change alters behavior. Keep shared delivery requirements and task checklists in GitHub Issues, and detailed implementation plans and checkpoint state in `.local/plan-issue/`, rather than duplicating them in specs.
- Report what was verified and which criteria remain unverified. Run checks appropriate to the changed application. Documentation-only changes need link and consistency checks, not application test runs.

## Repository conventions

- The backend owns domain rules, authorization, and database access. Frontend visibility checks do not replace backend authorization.
- Supabase Auth owns application identity. Domain objects belong in PostgreSQL's `public` schema. Do not modify Supabase-managed `auth` objects.
- Keep credentials, personal registration data, payment proofs, and private safety notes out of source files and public assets.

