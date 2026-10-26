# Tournament results

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Later tournament capability, after the first registration/proof-review release |
| Applications | frontend, backend |
| Sources | Product-owner overview on 17 October 2026 |

## Goal

Allow users to consult results for the Karlbrüder tournaments represented in the platform.

## Confirmed direction

- **RES-001:** Results belong to the selected tournament and are available through the combined frontend/backend application.
- **RES-002:** Supporting tournament results must work for later events as well as Monomachia.
- **RES-003:** Results consultation does not authorize access to private registration, payment, contact, or safety data.
- **RES-004:** Results for non-internal tournaments may be made public without sign-in. Internal results are restricted to guild members, including guild staff (admins), under PROD-006.
- **RES-005:** Guild staff (admins) enter, publish, and correct results. There is no separate results-management role or event-specific admin grant.

## Proposed behavior requiring detail

The application needs a way to distinguish results available for consultation from information still being prepared. Staff entry/import methods, publication, and correction workflows still need definition when this later capability is scheduled. The proposed [Swiss rounds and round-robin final](swiss-format.md) define a separate later competition capability for pairing generation, match outcomes, qualification, and stage standings. Results consultation alone does not require that format, live scoring, or HEMA Ratings synchronization.

Users consult results according to RES-004. Participant-directory and results visibility is disclosed in the terms under PRIV-006, without a `show_on_public_list` opt-out. Only permitted display fields are shared; this does not expose private signup records or weaken internal-event restrictions.

## Acceptance criteria

- **RES-AC-001:** A user opening available results for one tournament sees that tournament's outcomes rather than another event's data.
- **RES-AC-002:** If results are not available, the application communicates that state without showing fabricated outcomes.
- **RES-AC-003:** Results responses contain no payment proofs, identity documents, private contact details, or safety notes.
- **RES-AC-004:** A guest can view non-internal results that have been made public but cannot retrieve internal tournament results.
- **RES-AC-005:** Guild staff can manage results across tournaments; non-admin users cannot publish or modify them.

These criteria establish consultation and the administrative access boundary. Detailed authoring and publication criteria must be added once their workflow is agreed.

## Open questions

None for the first registration/proof-review release. Results are explicitly deferred by PROD-011.

## Deferred questions

- **RES-Q1:** What outcomes should results show: rankings, category placements, individual matches, scores, or a document/link?

  This question concerns the published presentation. Competition standings and the proposed champion calculation are owned by the [Swiss-format specification](swiss-format.md).
- **RES-Q2:** Should guild staff enter results manually, import them, or both?
- **RES-Q3:** Should users see live/provisional updates or only final published results?
- **RES-Q4:** How should result corrections, versions, and participant notifications work?

## Related specifications

[Catalog](catalog.md), [administration](administration.md), [privacy](consent-and-privacy.md), [Monomachia 2027](events/monomachia-2027.md).
