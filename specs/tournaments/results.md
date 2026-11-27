# Tournament results

**Created**: 2026-10-17
**Last updated**: 2026-11-19

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Later tournament capability, after the first registration/proof-review release |
| Applications | frontend, backend |
| Sources | Product-owner overview on 17 October 2026 and [conduction decisions adopted on 19 November 2026](../../docs/tournament-conduction-validation.md) for [issue #91](https://github.com/karlbruder/karlbruder_monorepo/issues/91) |

## Goal

Allow users to consult results for the Karlbrüder tournaments represented in the platform.

## Confirmed direction

- **RES-001:** Results belong to the selected tournament and are available through the combined frontend/backend application.
- **RES-002:** Supporting tournament results must work for later events as well as Monomachia.
- **RES-003:** Results consultation does not authorize access to private registration, payment, contact, or safety data.
- **RES-004:** Results for non-internal tournaments may be made public without sign-in. Internal results are restricted to guild members, including guild staff (admins), under PROD-006.
- **RES-005:** Guild staff (admins) enter, publish, and correct results. There is no separate results-management role or event-specific admin grant.
- **RES-006:** Results consultation covers published schedules, individual matches and their confirmed bound records, scores, phase standings, qualification and podium. Apply the event's adopted sporting policy under [conduction](conduction.md). Do not imply that a fictional example or an unconfirmed result is official.
- **RES-007:** Staff enter and confirm match records manually in the Monomachia MVP. The prototype simulates this operation. Importing participants does not import match results. Real result-file import and HEMA Ratings synchronization are outside this issue's delivery.
- **RES-008:** Publishing a round releases its schedule and the subsequent provisional sporting record within the event's permitted audience. Each accepted confirmed bound updates the shared match view, even before final match confirmation, without a separate live-release action. Draft, failed and unaccepted submissions are not spectator records. Staff see editing controls and spectators see the same sporting composition in read-only mode.
- **RES-009:** Distinguish live/provisional, awaiting match confirmation, official and finally published information. Only confirmed results feed official standings. Final publication is an explicit staff action on settled outcomes and remains separate from live consultation. It must wait for required matches, ties and dependent corrections to be settled. Availability of an official live score does not itself claim that the event's final results have been published.
- **RES-010:** Corrections retain the earlier result, who made the change, when and why. Reopening an official result labels it under review. Recalculate the affected sporting information and identify dependent rounds, qualifiers, tie resolutions and podiums for explicit reconciliation under TC-020. The permitted consultation updates to show the revised state. Corrected final results require explicit republication, without concealing the previous version or presenting a stale publication as current.
- **RES-011:** The sporting projection may include display name, phase/round, Arena, match clock, score, confirmed bound outcomes, sporting sanctions, match status, standings and placement. Keep private incident reasons, staff notes, registration identifiers, birth dates, proofs, documents, contacts and internal administrative history out of that projection. An age decision may say “desempate por idade” without exposing the date. Preserve PRIV-001/006/010 disclosures and youth safeguards. Live sporting updates do not authorize image/voice capture, replay or advertising.
- **RES-012:** Restricted, unavailable, pending, failed-update and under-review states must be distinguishable. A failed staff submission must not announce a saved record. An unavailable update must not masquerade as current sporting information. Selecting another event must not retain the previous event's outcomes as if they belonged to it.

A future extension may rank athletes within each tag using their overall tournament ranking. Tag-based results and their publication are not part of the tag-management release.

## Consultation and publication flow

| State | What authorized players and spectators see | Staff action and effect |
| --- | --- | --- |
| Round in preparation | No draft pairings or unpublished bound drafts | Review and publish the schedule |
| Schedule published / match scheduled | Arena, athletes, order and match status | Call and start the match |
| Match running or paused | Accepted confirmed bounds, clock and provisional score in the shared sporting view | Record/correct bounds and explicitly pause/resume |
| Match awaiting confirmation | Provisional outcome clearly awaiting staff confirmation | Settle drafts, review ending and confirm |
| Result official | Confirmed outcome and updated official phase ranking | Continue progression or reopen with a reason |
| Final publication pending | Released live and official information remains distinguishable from an unpublished final podium | Settle prerequisites and explicitly publish final results |
| Final results published | Published outcomes, standings, podium and version/revision context | Correct through review and explicit republication |
| Result or dependency under review | Notice identifying the affected sporting state, without private reasons | Reconcile later impacts and confirm/republish the correction |
| Restricted or unavailable | Clear restriction or unavailability, without another event's data or invented outcomes | Staff can resolve relevant preparation or update issues |

The event boundary in RES-004 applies to schedules, bounds and provisional information as well as final results. The athlete's registration does not grant administrative access or override an internal event's member-only results boundary. Administrative panels are separate from the shared sporting projection.

Users consult results according to RES-004. Participant-directory and results visibility is disclosed in the terms under PRIV-006, without a `show_on_public_list` opt-out. Only permitted display fields are shared; this does not expose private registration records or weaken internal-event restrictions.

The later technical stage chooses how accepted changes reach viewers. Sending a record from a staff computer and refreshing spectator consultation are both required outcomes, without prescribing transport, timing guarantees, APIs or database design here. Issue #91 demonstrates them with shared fictional state, not a production service.

## Acceptance criteria

- **RES-AC-001:** A user opening available results for one tournament sees that tournament's outcomes rather than another event's data.
- **RES-AC-002:** If results are not available, the application communicates that state without showing fabricated outcomes.
- **RES-AC-003:** Results responses contain no payment proofs, identity documents, private contact details, or safety notes.
- **RES-AC-004:** A guest can view non-internal results that have been made public but cannot retrieve internal tournament results.
- **RES-AC-005:** Guild staff can manage results across tournaments; non-admin users cannot publish or modify them.
- **RES-AC-006:** Given a published round, when staff confirm a new bound record, then an eligible spectator sees that bound and provisional score through the same sporting composition, without editing controls or waiting for final match confirmation.
- **RES-AC-007:** Given an unconfirmed match outcome, when reviewing official standings, then it has not yet contributed official ranking credit. Confirming it applies the effect once and labels the outcome official.
- **RES-AC-008:** Given settled phase results and podium, when staff publish final results, then the audience sees an explicit final publication distinct from earlier live and official states. An unresolved relevant correction blocks that publication.
- **RES-AC-009:** Given a published outcome, when staff reopen and correct it with a reason, then the consultation identifies review, dependent sporting decisions are reconciled and corrected final publication requires a separate staff action.
- **RES-AC-010:** Given guest, member and admin scenarios for internal and non-internal events, when opening schedules, individual bounds or final results, then RES-004 is preserved for every state and no private registration fields or administrative controls leak into spectator consultation.
- **RES-AC-011:** Given a result ordered by age or a private incident decision, when opening the spectator view, then it shows the permitted sporting explanation without full birth dates, private reasons or staff history.
- **RES-AC-012:** Given a failed or pending record submission, when consulting the match, then the application does not claim a newly accepted bound or a successful save. When information cannot be updated, the unavailable state is identifiable.

These are intended functional outcomes, not evidence of a production feature. [Conduction](conduction.md) specifies the operation that produces them. [Monomachia](events/monomachia-2027.md#conduction-rules) owns its scoring, ranking and sporting tie-break policies.

## Open questions

None blocking the fictional Monomachia prototype. Results remain outside the first registration/proof-review release under PROD-011. Real privacy wording, coverage channels and youth publication readiness remain owned by PRIV-Q1.

## Deferred questions

- **RES-Q4:** Which participants should receive external or automatic notifications of a result correction, and through which channels? Correction history, review, consultation updates and republication are defined in RES-010. External notifications remain a later extension and are not required to simulate the in-view correction notice.

RES-Q1 was resolved by RES-006. RES-Q2 was resolved for the MVP by manual staff entry in RES-007. RES-Q3 was resolved by RES-008/009 and the owner's shared-live-view clarification. These retired IDs are not reused. Result import remains outside this MVP rather than an assumed import contract. The unresolved notification part of RES-Q4 is retained above.

## Related specifications

[Catalog](catalog.md), [administration](administration.md), [conduction](conduction.md), [privacy](consent-and-privacy.md), [Monomachia 2027](events/monomachia-2027.md).
