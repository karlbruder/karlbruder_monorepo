# 0001: Public website and authenticated application

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Recorded | 17 October 2026 |
| Sources | Product-owner overview in the specification discussion |

## Context

The repository contains a public website in `landing/` and an application formed by `frontend/` and `backend/`. Earlier [issue #21](https://github.com/karlbruder/karlbruder_monorepo/issues/21) placed a tournament sign-up form on the landing site. The owner clarified that logged-in users should register, submit proof, follow confirmation, and consult tournament results in the application.

## Decision

The public website introduces Karlbrüder at `karlbruder.com.br` and links visitors to event information, social channels, and the application at `app.karlbruder.com`. Registration enters the application through `/tournaments/registration` and requires authentication. Monomachia is its first major event. Membership and equipment inventory are future application capabilities.

## Consequences

- Registration UI belongs in `frontend/` and uses the shared backend.
- A public `/monomachia` presentation page may remain in `landing/`. Its registration entry point must lead into the application.
- Issue #20's generic tournament model remains useful but must support authenticated ownership.
- Issue #21's landing-form placement and submission references in #24 must be reconciled with this decision before dependent implementation. Those issues have not been edited by writing this record.
- The owner's later answers resolve guest access: public tournament listings/details are available without sign-in, and non-internal results may be made public. Internal tournaments/results require guild membership, including guild staff access. Registration is self-only, and personal records require authentication. These rules supersede the original undecided read-only visibility noted during initial drafting.
