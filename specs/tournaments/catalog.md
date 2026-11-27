# Tournament catalog

**Created**: 2026-10-17
**Last updated**: 2026-11-27

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Initial tournament platform |
| Applications | frontend, backend |
| Sources | Product-owner overview; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20); Monomachia source requirements, sections 1 and 8 |

## Goal

Let application users discover the tournaments Karlbrüder hosts, review participation conditions, and find registration and published results.

## Rules

- **CAT-001:** The catalog supports multiple tournaments with stable identifiers. Each tournament has a required unique slug. When staff omit the slug, it is derived from the display name, discipline, and the year of `starts_at`. The list is paginated and can be filtered by display name and by the event start date. `starts_at` and `ends_at` are the event dates. The registration window is separate. Selecting an event scopes its information, registration, and results to that event.
- **CAT-002:** A tournament can describe name, description, discipline, start/end dates, location, schedule, registration window, payment deadline, capacity, rules, equipment requirements, and cancellation policy.
- **CAT-010:** The initial date-only editor interprets event and payment dates in the staff member's browser time zone. Event starts use 00:00:00 and event ends and payment deadlines use 23:59:59 in that zone. This is an intentional simplification. Different staff time zones can produce different instants for the same selected date. The athlete interface displays event and registration boundaries in the browser time zone. Event-specific time zones and configurable times remain future work.
- **CAT-003:** Event details communicate the registration date range and capacity status. When capacity is full, the registration page warns that approved payment will lead to the waitlist unless a seat becomes available. Being full does not itself prevent submission or proof upload. Staff may explicitly close new registrations; the backend enforces that closure. Submission never guarantees a seat.
- **CAT-004:** Published information must distinguish confirmed facts from unknown details. Unknown prices, dates, policies, or locations are not presented as final values.
- **CAT-005:** Guests and regular users can browse public, non-internal tournaments. Internal tournaments are excluded from public listings and restricted to guild members, including guild staff (admins), for viewing and participation. The backend enforces these rules on direct requests as well as listings.
- **CAT-006:** Catalog display does not replace server-side checks of registration windows, eligibility, duplicates, and capacity.
- **CAT-007:** Monomachia 2027 uses the same tournament capability as later events. Its v1 discipline is `longsword`, following issue #20's single-discipline starting model.
- **CAT-008:** Guild staff may edit any tournament facts at any time, including after registrations begin, subject to domain constraints such as the confirmed-capacity minimum. Participant notifications about tournament fact changes are deferred. Future notification work covers event dates, registration dates, payment deadline, schedule, location, regulation, equipment requirements, and cancellation policy. Preserve earlier policy acceptances when documents change.
- **CAT-009:** The tournament catalog lists and describes `Tournament` resources. Staff configure event facts and the products offered for each tournament. Each registration product has a name, description of included benefits, and a price in BRL. A tournament may offer multiple products. Staff can create products or reuse existing active products during tournament creation and for existing tournaments. A shared product remains one product across its linked tournaments. Staff can see every linked tournament before changing it. Pix destination and receiving-account details are payment configuration.
- **CAT-010:** Staff may change a product name, description, or price for future registrations, or deactivate the product. The change affects every linked tournament. The staff interface shows those tournaments and the shared effect before confirmation. Deactivation makes the product unavailable for new registrations in all linked tournaments. An existing order retains the selected product name, description, and agreed amount. Price terms are fixed when the price record is created. A new amount uses a new price record, even before a purchase.

Registration uses catalog products and order items. Staff configure tournament offerings in the application. Each registration uses its order item price.

When refreshing an existing tournament's offerings after an attachment conflict,
exclude products already linked to that tournament from the pending selection.
Preserve other selected products and new product drafts so staff can retry.

## Tournament documents

In staff settings, place documents in a separate section after tournament details and tags. Once a tournament has been saved, staff can upload or replace the rules and cancellation policy independently. Each is optional. Show the current file and reveal the uploader when staff choose to publish or replace a file. Accept PDF, JPEG, or PNG up to 10 MiB per policy. Publishing makes the staff-selected file current. Show progress, success, or failure on the affected document, and keep the current file available until its replacement succeeds. Preserve earlier versions and their acceptance references. See [WF-12](../design/app-wireframes/index.html#WF-12/edit).

Below the registration policies, staff can add additional tournament documents. Each document has a staff-entered title and a PDF, JPEG, or PNG file up to 10 MiB. Publishing an additional document leaves policy versions and registration acceptance terms unchanged. See [WF-12](../design/app-wireframes/index.html#WF-12/policyadditional).

The signed-in tournament view and registration form show a document section when there is at least one file the viewer can open. Each tile shows the document title, file format, and new-tab icon. In a visible section, show “conteúdo ainda não disponível” for missing rules and cancellation policies. Signed-in viewers can open additional documents using the tournament's catalog visibility rules. Open files in a new tab on demand through an authorized download. The separate tournament details screen in [WF-02](../design/app-wireframes/index.html#WF-02/athlete) remains a design proposal.

Registration records the policy versions displayed at acceptance. Staff can enable refunds after publishing a cancellation policy that permits them.

## User flow

The user selects a tournament, reads its available details, and enters registration at `/tournaments/registration`. Signing in is required to register, and a user registers only themselves. In the later results capability, non-internal results may be public; internal results require guild membership, including the inherited access of guild staff.

Guild staff (admins) can create and manage all tournaments. API naming and display ordering are implementation choices. Staff can delete a tournament only when it has no registrations. This applies even after registrations close. A future tournament with match results must also be protected from deletion. This specification does not introduce a draft/published/archived lifecycle absent from the agreed Tournament model.

## Acceptance criteria

- **CAT-AC-001:** At least two configured tournaments can be listed and opened without duplicating event-specific application code.
- **CAT-AC-002:** Selecting one tournament never displays another tournament's prices, rules, registration, or results by mistake.
- **CAT-AC-003:** A closed registration window prevents registration through the API even if a stale page displays an active button.
- **CAT-AC-004:** Unknown event facts remain visibly unconfirmed until configured.
- **CAT-AC-005:** A guest can view public tournament listings and details, while a guest or non-member regular user cannot list or retrieve internal tournaments.
- **CAT-AC-006:** A guild member or guild staff user can view internal tournaments. Administrative event changes require the admin role.
- **CAT-AC-007:** Tournament edits preserve prior acceptance evidence. Notifications about changed tournament facts remain future work.
- **CAT-AC-009:** Staff can configure multiple registration products with distinct prices and descriptions during tournament creation and for an existing tournament. Staff can reuse a product and see each linked tournament before a shared change.
- **CAT-AC-010:** Changing or deactivating a shared product affects future availability or terms across its linked tournaments. Existing registrations retain the agreed product name, description, and amount. A new amount creates a new price record.
- **CAT-AC-008:** Explicitly closing new registrations rejects new submissions even within the date window. A full event that remains open displays a waitlist warning without claiming that form submission itself assigns waitlist status.

## Open questions

None. Tournament listing uses the existing resource, and editing rules and the notification deferral are defined above. Actual event values are configuration inputs, not unanswered product decisions.

## Deferred questions

- **CAT-Q3:** Beyond the initial single-discipline model, how should tournament categories and multi-discipline participation work?

Future category-specific capacity belongs in [CAP-Q5](capacity-and-waitlist.md#deferred-questions). Internal-event eligibility and guest visibility are already decided.

## Related specifications

[Registration](registration.md), [capacity](capacity-and-waitlist.md), [results](results.md), [Monomachia 2027](events/monomachia-2027.md).
