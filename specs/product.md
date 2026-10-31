# Karlbrüder product

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Product direction, initial platform, and future capabilities |
| Sources | Product-owner overview and answers in this document; [project source map](README.md#project-source-map) |

## Purpose

Karlbrüder maintains a public website and an authenticated application. The website introduces the historical fencing group. The application's first purpose is participation in Karlbrüder tournaments. Later it will also support association membership and equipment inventory.

## Users and roles

| User or role | Purpose |
| --- | --- |
| Public visitor | Discover the group, browse public tournament information without signing in, and find social channels and the application |
| Regular user | Register themselves for public tournaments, consult public tournament details and permitted results, access their own registrations and payment proofs, and update their own profile information |
| Guild member | Everything a regular user can do, plus access internal tournaments and their results, and consult their own association membership status and monthly payments when those capabilities are delivered |
| Guild staff (admin) | Everything a guild member can do, plus administrative work, including tournament operations and future inventory management |

The initial application roles are regular user, guild member, and guild staff (admin). Permissions are cumulative: guild members inherit regular-user access, and guild staff inherit guild-member access. A public visitor is not an authenticated role. Association membership is not a prerequisite for an application account or an open tournament. Backend enforcement and permission storage are detailed in the [authentication and access specification](identity/authentication-and-access.md).

## Application boundaries

- **PROD-001:** `landing/` is the public single-page application. It presents the group to visitors arriving from Facebook, Instagram, Google search, and other channels, and links to event information and the application.
- **PROD-002:** `frontend/` and `backend/` form one application. Registration, payment-proof submission, personal registration tracking, and tournament results belong in that application.
- **PROD-003:** Visitors can browse the catalog and details of public, non-internal tournaments without signing in. Internal tournaments are excluded from public listings and restricted to authenticated guild members, including guild staff. Registration and access to personal registrations or payment proofs require authentication.
- **PROD-004:** The application supports all Karlbrüder tournaments. Monomachia is the first major event, not a separate tournament backend or a hardcoded product boundary.
- **PROD-005:** Monthly association membership is a separate relationship from tournament participation. Payment and confirmation of one do not establish the other.
- **PROD-006:** Results of non-internal tournaments may be made publicly available without sign-in. Internal tournament results are restricted to guild members, including guild staff. This does not make publication mandatory for every non-internal tournament. Results delivery follows the first release.
- **PROD-007:** Users register only themselves. An account cannot register another athlete, including a minor.
- **PROD-008:** A minor registering themselves uploads a scanned parental responsibility term through the platform and may participate only with parental accompaniment during the event. At the event, both the minor and parent present their identity documents for staff verification. The uploaded signed term, in-person check, and parental accompaniment are all required.
- **PROD-009:** The initial application roles are regular user, guild member, and guild staff (admin), with cumulative permissions as described above. Guild staff have full application access across all tournaments, without event-specific grants. Regular users manage only their own participant records and profile information. The backend enforces these boundaries; updating a profile must not allow a user to grant themselves membership or admin privileges.
- **PROD-010:** The application uses `app.karlbruder.com`. The public website uses `karlbruder.com.br`. Public event registration links open the frontend route `/tournaments/registration`, whose form submits a POST request to the backend tournament sign-up resource. The backend endpoint path and the mechanism for carrying the selected tournament through sign-in belong in the detailed registration and identity specifications.
- **PROD-011:** The first usable release delivers tournament registration and payment-proof upload/review, with the authentication, access controls, and validation needed to support them. Results and other extensions follow in later releases. A full tournament administration suite, broader automatic messaging, and exports may follow; the initial review flow requires authorized staff decisions, waitlist-entry email when applicable, and rejected-evidence notification with resubmission. Refund confirmation and material event-change notifications are required when their respective workflows are delivered.
- **PROD-012:** Regular users can register only for public, non-internal tournaments. Internal tournament access and participation are limited to guild members, including guild staff, and remain subject to the event's other eligibility rules.
- **PROD-013:** Initial tournament payments accept Pix only, in BRL, until an official gateway is implemented. Amount, destination, dates, venue, and event rules are Tournament/payment configuration, not hardcoded product values.
- **PROD-014:** Terms disclose participant-directory and results visibility to authorized platform users; there is no participant-list opt-out. Shared views use limited display fields and preserve internal-event and private-data restrictions. Participants may edit their own permitted signup fields; staff-only notes and system-managed fields remain protected.
- **PROD-015:** The public website's [Hall of Heroes](public-website/presentation-and-navigation.md#hall-of-heroes) spotlights Karlbrüder members and lists their tournament achievements, including national and regional tournaments. This public presentation complements the application's tournament results capability without changing internal-event or private-data restrictions.

## First-release tournament experience

1. A visitor discovers Karlbrüder or an event through the public website or social media.
2. The visitor enters the application at `app.karlbruder.com`, browses public tournaments, and reviews an event's rules and registration conditions without needing to sign in. Internal tournaments require guild-member access.
3. The visitor follows the registration entry point to `/tournaments/registration` and signs in to submit a registration.
4. The user submits a valid registration for themselves and receives an inscription number.
5. The user follows payment instructions and uploads payment proof.
6. Guild staff (admins) validate the registration and payment, subject to capacity.
7. The user follows the registration's status and confirmation in the application.

Submission and payment-proof upload do not themselves confirm a seat. A minor's participation also requires the signed parental responsibility term and parental accompaniment. Tournament results are a later capability with the visibility rules in PROD-006. Detailed flows are defined in the [tournament specs](tournaments/catalog.md).

## Delivery scope

| Scope | Capabilities |
| --- | --- |
| First usable release | Tournament registration and payment-proof upload/manual review, with supporting authentication, public event information, internal-event restrictions, personal status, required validation, authorized staff review, waitlist email when applicable, and rejected-evidence notification/resubmission |
| Later tournament capabilities | Results, full tournament administration, broader automatic and editable communications, exports, and broader cancellation/refund workflows; delivery order remains to be scheduled |
| Future association capabilities | Monthly membership status and payment tracking, exemptions and discounts, equipment inventory |
| Future payment automation | A payment provider or gateway, with separate business rules for tournament fees and membership payments |

The first-release boundary is defined by PROD-011. Later capabilities remain part of the intended platform but are not prerequisites for that release.

Privacy, access control, and mandatory event terms apply to any released feature that handles the corresponding data. A later implementation issue does not waive those requirements. The MVP boundary for each capability must be stated in its delivery issue.

## Acceptance criteria

- **PROD-AC-001:** A visitor can understand the group and find the event or application entry point through the public website.
- **PROD-AC-002:** An authenticated participant can complete the registration, proof submission, and confirmation-tracking journey within the application.
- **PROD-AC-003:** A second tournament can use the same application without duplicating Monomachia-specific code and storage.
- **PROD-AC-004:** Tournament participation does not create association membership or mark monthly dues as paid.
- **PROD-AC-005:** Results made public for a non-internal tournament can be viewed without signing in. Internal tournament results cannot be viewed by guests or regular users without guild membership.
- **PROD-AC-006:** A user cannot create a registration for a different athlete through the UI or API.
- **PROD-AC-007:** A minor without a signed parental responsibility term or parental accompaniment is not permitted to participate.
- **PROD-AC-008:** A guest can browse public tournament listings and details, but cannot discover internal tournaments through public listings or retrieve their details through the API. An authenticated regular user also cannot access internal tournaments.
- **PROD-AC-009:** A guild member receives regular-user access plus member access, and guild staff receive both plus administrative access. Profile editing cannot elevate the caller's role.
- **PROD-AC-010:** A public event's registration entry opens `/tournaments/registration`, and an authenticated valid submission uses POST to create a sign-up through the backend.
- **PROD-AC-011:** The first release supports registration, proof upload, authorized proof review, waitlist-entry email when applicable, and rejected-evidence notification/resubmission without requiring results, a full administration suite, the broader messaging suite, or exports to be delivered first.

## Follow-up ownership

Product-level application and role boundaries are resolved by the rules above. Detailed policies and implementation work belong in the capability specifications:

- [Authentication and access](identity/authentication-and-access.md): global admin access and regular-user/member boundaries; trusted role storage is an implementation detail, while callbacks and session handling are refined there.
- [Registration](tournaments/registration.md): resolved registration rules and acceptance criteria; backend route naming and selected-tournament handoff are implementation details.
- [Consent and privacy](tournaments/consent-and-privacy.md): required declarations and parental checks; final acceptance text and deletion-request policy remain open.
- [Capacity and waitlist](tournaments/capacity-and-waitlist.md): staff chooses waitlisted participants; the backend enforces capacity on confirmation without imposing queue priority or automatic promotion.
- [Payments and confirmation](tournaments/payments-and-confirmation.md): proof submission and the minimum authorized staff-review workflow for the first release.

See the [open-question index](open-questions.md) for the remaining current-scope and deferred questions, each listed in one owning specification.

## Related specifications

[Architecture](architecture.md), [application boundary decision](decisions/0001-public-website-and-application.md), [authentication](identity/authentication-and-access.md), [membership](membership/overview.md), [inventory](inventory/overview.md).
