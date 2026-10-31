# Tournament catalog

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial tournament platform |
| Applications | frontend, backend |
| Sources | Product-owner overview; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 1 and 8 |

## Goal

Let application users discover the tournaments Karlbrüder hosts, review participation conditions, and find registration and published results.

## Rules

- **CAT-001:** The catalog supports multiple tournaments with stable identifiers. Each tournament has a required unique slug. When staff omit the slug, it is derived from the display name, modality, and the year of `starts_at`. The list is paginated and can be filtered by display name and by the event start date. `starts_at` and `ends_at` are the event dates. The registration window is separate. Selecting an event scopes its information, registration, and results to that event.
- **CAT-002:** A tournament can describe name, description, modality, start/end date and time, location, schedule, fee, registration window, payment deadline, capacity, rules, equipment requirements, and cancellation policy.
- **CAT-003:** Event details communicate the registration date range and capacity status. When capacity is full, the registration page warns that approved payment will lead to the waitlist unless a seat becomes available. Being full does not itself prevent submission or proof upload. Staff may explicitly close new registrations; the backend enforces that closure. Submission never guarantees a seat.
- **CAT-004:** Published information must distinguish confirmed facts from unknown details. Unknown fees, dates, policies, or locations are not presented as final values.
- **CAT-005:** Guests and regular users can browse public, non-internal tournaments. Internal tournaments are excluded from public listings and restricted to guild members, including guild staff (admins), for viewing and participation. The backend enforces these rules on direct requests as well as listings.
- **CAT-006:** Catalog display does not replace server-side checks of registration windows, eligibility, duplicates, and capacity.
- **CAT-007:** Monomachia 2027 uses the same tournament capability as later events. Its v1 modality is `longsword`, following issue #20's single-modality starting model.
- **CAT-008:** Guild staff may edit any tournament facts at any time, including after registrations begin, subject to domain constraints such as the confirmed-capacity minimum. Notify registered participants when event dates, registration dates, payment deadline, schedule, location, regulation, equipment requirements, or cancellation policy change. Other fact changes do not require notification. Preserve earlier regulation acceptances when text changes.
- **CAT-009:** The catalog is the listing and detail experience for `Tournament` resources, not a separate domain object. Fees, dates, venue, schedule, equipment, regulation, and capacity are staff-managed configuration. Currency is BRL. Pix destination and receiving-account details are payment configuration, not fixed product-spec values.

## User flow

The user selects a tournament, reads its available details, and enters registration at `/tournaments/registration`. Signing in is required to register, and a user registers only themselves. In the later results capability, non-internal results may be public; internal results require guild membership, including the inherited access of guild staff.

Guild staff (admins) can create and manage all tournaments. API naming and display ordering are implementation choices. This specification does not introduce a draft/published/archived lifecycle absent from the agreed Tournament model.

## Acceptance criteria

- **CAT-AC-001:** At least two configured tournaments can be listed and opened without duplicating event-specific application code.
- **CAT-AC-002:** Selecting one tournament never displays another tournament's fee, rules, registration, or results by mistake.
- **CAT-AC-003:** A closed registration window prevents registration through the API even if a stale page displays an active button.
- **CAT-AC-004:** Unknown event facts remain visibly unconfirmed until configured.
- **CAT-AC-005:** A guest can view public tournament listings and details, while a guest or non-member regular user cannot list or retrieve internal tournaments.
- **CAT-AC-006:** A guild member or guild staff user can view internal tournaments. Administrative event changes require the admin role.
- **CAT-AC-007:** Changing a date, schedule, location, regulation, equipment requirement, or cancellation policy notifies affected registrants; changing another fact does not require a notification.
- **CAT-AC-008:** Explicitly closing new registrations rejects new submissions even within the date window. A full event that remains open displays a waitlist warning without claiming that form submission itself assigns waitlist status.

## Open questions

None. Tournament listing uses the existing resource, and editing/notification rules are defined above. Actual event values are configuration inputs, not unanswered product decisions.

## Deferred questions

- **CAT-Q3:** Beyond the initial single-modality model, how should tournament categories and multi-modality participation work?

Future category-specific capacity belongs in [CAP-Q5](capacity-and-waitlist.md#deferred-questions). Internal-event eligibility and guest visibility are already decided.

## Related specifications

[Registration](registration.md), [capacity](capacity-and-waitlist.md), [results](results.md), [Monomachia 2027](events/monomachia-2027.md).
