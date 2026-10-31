# Public website presentation and navigation

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial public website and application handoff |
| Applications | landing |
| Sources | Product-owner overview and Hall of Heroes request; [#1](https://github.com/karlbruder/karlbruder_monorepo/issues/1), [#21](https://github.com/karlbruder/karlbruder_monorepo/issues/21), [#24](https://github.com/karlbruder/karlbruder_monorepo/issues/24) |

## Goal

Help visitors arriving from Facebook, Instagram, Google search, and other channels understand Karlbrüder and discover its activities.

## Rules

- **WEB-001:** The public single-page application presents the group and provides clear navigation to its activities, social channels, and the tournament application when available.
- **WEB-002:** The Monomachia entry point may present event information and link to the event's Instagram page. Event branding must preserve readable content and navigation on phones and desktops.
- **WEB-003:** Registration calls to action lead to `app.karlbruder.com/tournaments/registration`. The public website is `karlbruder.com.br`. Account sessions, registration forms, proof uploads, and personal registration status are owned by `frontend/` and `backend/`; the selected-tournament handoff is an implementation detail.
- **WEB-004:** The public site presents event information and links to the official event page and application registration. Content is maintained in the public site without fetching tournament facts from the backend. It must agree with configured event facts; unknown values must not be invented.
- **WEB-005:** Public assets and pages must not expose personal registration data, payment proofs, or private safety information.
- **WEB-006:** The public website includes a **Hall of Heroes** section that spotlights Karlbrüder members and lists their tournament results, including national and regional tournaments. Visitors can view it without signing in.

## Hall of Heroes

Hall of Heroes celebrates members' competitive achievements. Each listed result identifies the member, the tournament, and their result. It is public group presentation; tournament results management in the application retains its existing scope and access rules.

## Journey

A visitor discovers the group, follows an event link, and enters the application. Public tournament listings and details can be browsed without signing in. Registration requires sign-in, which the application handles along with the selected tournament context. Internal tournaments remain restricted to guild members, including guild staff (admins).

## Acceptance criteria

- **WEB-AC-001:** A visitor can identify the group and follow the intended social or event link on phone and desktop.
- **WEB-AC-002:** Once the application entry is released, an event's Register action reaches that tournament's application flow rather than submitting a public-site form.
- **WEB-AC-003:** A direct visit or browser refresh on a supported public route renders the correct page through the chosen hosting configuration.
- **WEB-AC-004:** A visitor can view Hall of Heroes without signing in and identify the featured members and their listed results at national and regional tournaments.

## Implementation baseline

On 17 October 2026, `landing/src/App.js` has homepage and `/monomachia` routes. The inspected Monomachia page links to `https://www.instagram.com/monomachia.karlbruder`. The existence of the page does not verify an API-backed registration flow.

Issue #21's landing-form placement is superseded by [decision 0001](../decisions/0001-public-website-and-application.md). The issue has not been updated as part of writing this specification.

## Open questions

None. Public-site content and links are maintained separately from the backend. The application domain and registration route are decided by PROD-010.

## Related specifications

[Product](../product.md), [catalog](../tournaments/catalog.md), [Monomachia 2027](../tournaments/events/monomachia-2027.md), [deployment](../platform/deployment.md).
