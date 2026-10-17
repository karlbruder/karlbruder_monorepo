# Specifications

These living specifications describe the intended Karlbrüder product and platform. The first baseline was assembled on 17 October 2026 from the product owner's overview, all 20 items in the [Website project](https://github.com/orgs/karlbruder/projects/1), the existing [Monomachia requirements](../monomachia-requirements.md), and a read-only inspection of this checkout.

## Start here

| Document | Purpose |
| --- | --- |
| [Product](product.md) | Users, application boundaries, initial scope, and future capabilities |
| [Architecture](architecture.md) | Service responsibilities, data flow, integrations, and observed implementation gaps |
| [Open-question index](open-questions.md) | Deduplicated current-scope questions, deferred questions, and technical follow-up owners |
| [Decisions](decisions/README.md) | Significant choices and superseded directions |
| [Specification template](templates/spec.md) | Starting point for a capability or platform specification |

## Capability index

| Area | Specifications | Applications |
| --- | --- | --- |
| Public website | [Presentation and navigation](public-website/presentation-and-navigation.md) | landing |
| Identity | [Authentication and access](identity/authentication-and-access.md) | frontend, backend |
| Tournaments | [Catalog](tournaments/catalog.md), [registration](tournaments/registration.md) | frontend, backend |
| Tournament operations | [Payments and confirmation](tournaments/payments-and-confirmation.md), [capacity and waitlist](tournaments/capacity-and-waitlist.md), [administration](tournaments/administration.md) | frontend, backend |
| Tournament outputs | [Results](tournaments/results.md), [consent and privacy](tournaments/consent-and-privacy.md), [communications](tournaments/communications.md) | frontend, backend |
| First major event | [Monomachia 2027](tournaments/events/monomachia-2027.md) | landing, frontend, backend |
| Future association features | [Membership](membership/overview.md), [equipment inventory](inventory/overview.md) | frontend, backend |
| Platform | [Local development](platform/local-development.md), [data storage](platform/data-storage.md), [team access](platform/team-access.md), [deployment](platform/deployment.md) | all |

## How to read status and rules

All capability documents start as **Draft**. The product owner's explicit application boundaries are recorded as decisions. A draft collects known requirements and unresolved questions. It does not mean the feature is implemented or that every detail has been accepted.

Each document states its delivery scope: initial platform, planned tournament extension, future capability, or platform foundation. A future requirement must not silently become part of an unrelated implementation task. Delivery order and task completion live in Issues and Projects.

Rule IDs such as `REG-001` identify intended behavior. Acceptance IDs such as `REG-AC-001` identify observable outcomes. Keep IDs stable when editing. Update a rule's wording and explain significant changes in the PR. Avoid reusing an old ID for a different requirement.

Open questions are unresolved. An illustrative status or implementation option must not be treated as a complete contract. Resolve questions that affect a task before implementing the dependent behavior.

## Question ownership and terminology

Each unresolved product question is defined in one owning spec as `<PREFIX>-Q1`, with a stable ID. Other specs link to that entry instead of repeating it. `Open questions` contains current-scope product decisions. Routine event values such as fee, dates, venue, and regulation belong in Tournament configuration and are not additional product-policy questions. `Deferred questions` preserves later capability decisions. `Implementation decisions` and `Implementation and operations decisions` preserve engineering work and live-state verification without requiring another product answer for route naming, ports, or already selected services.

When an answer arrives, fold it into rules and acceptance criteria, remove the resolved question, and update dependent specs plus the [question index](open-questions.md). Never silently discard an unresolved topic to reduce the count. Do not reuse a retired question ID for a different decision. Counts are question entries rather than individual subchoices, and not every open entry blocks all implementation work.

Use **guild staff (admin)** for the administrative role. In legacy material, "organizer" means guild staff, not an additional role. Staff have global application access, while AWS operational access remains a separate policy.

## Working with issues and code

1. Read the assigned issue, relevant specs, and linked decisions.
2. Identify conflicts and questions that affect the change. The latest explicit product-owner direction governs earlier assumptions. Specs should be updated to reflect that direction.
3. Implement the issue's scope against the applicable acceptance criteria.
4. Verify the criteria and update affected specs in the same PR when behavior changes.
5. Report gaps honestly. Code inspection, board status, and a successful runtime test are different forms of evidence.

Code establishes the observed implementation baseline. It does not redefine desired behavior automatically. READMEs explain setup. [Runbooks](../docs/runbooks/README.md) explain operational procedures. Avoid copying those procedures into every spec.

## Project source map

This maps every item returned by the Website project inventory. Issue descriptions and project status were read earlier in this conversation. Comments and linked PRs were not audited. The table is provenance, not a replacement project board.

| Source | Specification destination | Treatment |
| --- | --- | --- |
| [#1: Create private app](https://github.com/karlbruder/karlbruder_monorepo/issues/1) | Product, architecture, membership | Preserve application separation and membership goal |
| [#2: Cognito authentication](https://github.com/karlbruder/karlbruder_monorepo/issues/2) | Identity, decision 0002 | Historical implementation, superseded by Supabase |
| [#3: Google sign-in](https://github.com/karlbruder/karlbruder_monorepo/issues/3) | Identity | Preserve OAuth flow; its references to #19 are stale because #19 now concerns AWS SSO |
| [#6: Local Postgres](https://github.com/karlbruder/karlbruder_monorepo/issues/6) | Local development, data storage | Preserve local PostgreSQL foundation |
| [#7: Local and deployed database](https://github.com/karlbruder/karlbruder_monorepo/issues/7) | Data storage | Preserve environment configuration and schema separation |
| [#8: Dockerize applications](https://github.com/karlbruder/karlbruder_monorepo/issues/8) | Local development | Preserve containerized local workflow |
| [#9: Backend JWT verification](https://github.com/karlbruder/karlbruder_monorepo/issues/9) | Identity | Preserve verified API identity |
| [#11: Landing account migration](https://github.com/karlbruder/karlbruder_monorepo/issues/11) | Deployment | Planned account and hosting migration |
| [#12: Landing continuous deployment](https://github.com/karlbruder/karlbruder_monorepo/issues/12) | Deployment | Issue body is empty; existing workflow is the baseline evidence |
| [#13: Session Manager](https://github.com/karlbruder/karlbruder_monorepo/issues/13) | Deployment | Intermediate stage after #25, before #23 |
| [#18: Supabase frontend authentication](https://github.com/karlbruder/karlbruder_monorepo/issues/18) | Identity | Desired email/password and recovery flows need verification despite Done status |
| [#19: AWS SSO](https://github.com/karlbruder/karlbruder_monorepo/issues/19) | Team access | Separate operational identity from application identity |
| [#20: Tournament models and APIs](https://github.com/karlbruder/karlbruder_monorepo/issues/20) | Tournament specs, data storage | Preserve domain rules; add authenticated ownership from the latest overview |
| [#21: Public registration page](https://github.com/karlbruder/karlbruder_monorepo/issues/21) | Website, registration, decision 0001 | Landing form placement is superseded by authenticated application registration |
| [#22: Repository documentation](https://github.com/karlbruder/karlbruder_monorepo/issues/22) | Local development, READMEs, runbooks | Preserve onboarding and configuration requirements |
| [#23: ECR deployment](https://github.com/karlbruder/karlbruder_monorepo/issues/23) | Deployment | Planned replacement for zip/build-on-host deployment |
| [#24: Monomachia visual identity](https://github.com/karlbruder/karlbruder_monorepo/issues/24) | Website, Monomachia event | Preserve event presentation; submission references follow decision 0001 |
| [#25: EC2 and SCP deployment](https://github.com/karlbruder/karlbruder_monorepo/issues/25) | Deployment | Initial deployment stage, not the permanent target |
| Project draft: monthly membership payment tracking | Membership | Future scope; fees, exemptions, and discounts unresolved |
| Project draft: private frontend deployment | Deployment, decision 0003 | Resolved by owner: Nginx/frontend/backend in `compose.prod.yml`, with hosted Supabase PostgreSQL |

The existing Monomachia source document describes broader guild requirements than the current implementation issues. This set preserves them in the relevant tournament documents, including communications, administration, consent, and privacy. Proposed features there are not evidence of delivery.
