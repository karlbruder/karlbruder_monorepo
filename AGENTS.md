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

- Local `compose.yml` runs frontend, backend, and domain PostgreSQL. Authentication still uses hosted Supabase. Add Ministack for local S3 emulation when file storage is implemented.
- Production `compose.prod.yml` runs separate Nginx, frontend, and backend services. Nginx preserves `/api` when forwarding to the backend and sends other application requests to the frontend. Production domain data lives in Supabase PostgreSQL's `public` schema; there is no PostgreSQL container.
- Cloudflare manages DNS and public TLS, proxying the application A record to the EC2 Elastic IP. HTTP redirects to HTTPS at Cloudflare. The self-signed Nginx origin publishes 443 only; frontend/backend ports stay internal. Keep existing local development ports. Local SMTP configuration is deferred, likely real SES with real credentials.
- Private production files use Amazon S3. Application email uses AWS SES via SMTP. See [architecture](specs/architecture.md) and [decision 0003](specs/decisions/0003-local-and-production-stacks.md) for intended stacks and implementation gaps.

## Read the relevant specifications

Before changing behavior, read [the specification index](specs/README.md), then the relevant capability specifications and linked decisions. Read [the product overview](specs/product.md) and [architecture](specs/architecture.md) when the task crosses application or domain boundaries.

Read the assigned GitHub issue when its contents are available or access is authorized. Specifications describe intended behavior. Issues describe delivery scope, dependencies, and tasks. A closed issue is not evidence that every acceptance criterion is implemented.

The user's latest explicit direction takes precedence over earlier repository documents. Surface conflicts between specifications, issues, and implementation. Do not restore a superseded design just because an old issue describes it. In particular, issue #21's landing-site registration form is superseded by authenticated registration in `frontend/`.

## Implement and verify

- Follow the relevant rules and acceptance criteria. Cite their IDs in meaningful tests or verification notes where useful.
- Open questions are unresolved decisions, not permission to invent business rules. Ask about questions that affect the requested behavior while continuing independent work.
- Consult [the open-question index](specs/open-questions.md) before asking for a product decision. Define each question once in its owning spec, link to it from related specs, and keep current-scope, deferred, and technical implementation topics distinct. Fold answers into every affected spec and update the index. Do not re-ask resolved choices or require all questions to be answered before independent work can proceed.
- Future scope does not authorize implementing that capability during an unrelated task.
- Update the relevant specification when the requested change alters behavior. Keep implementation plans and task checklists in GitHub Issues rather than duplicating them in specs.
- Report what was verified and which criteria remain unverified. Run checks appropriate to the changed application. Documentation-only changes need link and consistency checks, not application test runs.

## Repository conventions

- The backend owns domain rules, authorization, and database access. Frontend visibility checks do not replace backend authorization.
- Supabase Auth owns application identity. Domain objects belong in PostgreSQL's `public` schema. Do not modify Supabase-managed `auth` objects.
- Keep credentials, personal registration data, payment proofs, and private safety notes out of source files and public assets.

