# Tournament conduction validation

**Created**: 2026-11-19
**Last updated**: 2026-11-19

## Purpose and current evidence

This record preserves the functional sources and product-owner decisions for [issue #91](https://github.com/karlbruder/karlbruder_monorepo/issues/91). It gives a later reviewer enough context to use the specifications without reconstructing a chat or opening a personal file path.

The owner adopted the source's confirmed rules and functional MVP proposals on 19 November 2026. They also supplied the presence, Arena and shared-live-view decisions below. This is evidence of requirements adoption. No navigable prototype walkthrough, visual approval, production implementation or third-party regulatory review has yet been recorded. Do not treat the source's technical examples as required APIs or database structures.

## Sources and precedence

| Source | Evidence and treatment |
| --- | --- |
| Issue #91 | Prototype and functional specifications, fictional data, existing admin access, access/privacy boundaries and later modeling handoff. Issue read on 19 November 2026, open and without comments |
| `TournamentConduction-modelagem.md` | Version 1.3 dated 19 November 2026. Owner-supplied source defining confirmed rules, MVP proposals and residual exceptions |
| Source fingerprint | SHA-256 `F3FD0CEEDC06C380BC242FA7B55983FC86EB16CBB743B84F9573BF24DFAC7317`. A local planning copy is retained. Required functional contents are consolidated in the linked repository specifications |
| Owner's P1 response, 19 November 2026 | “Adotar também as propostas do arquivo” in response to adopting the confirmed rules and MVP proposals |
| Owner's P2 response, 19 November 2026 | Basic organizer-marked presence, n numbered Arenas with optional names created during event preparation, sequential balanced distribution of matches without a draw |
| Owner's P3 response, 19 November 2026 | Essentially the same sporting screen, editable by staff and read-only for spectators, with live updates as staff records are accepted |
| Existing repository contracts | [AUTH-008](../specs/identity/authentication-and-access.md#authorization-rules), [results](../specs/tournaments/results.md#confirmed-direction), [privacy](../specs/tournaments/consent-and-privacy.md#rules) and the issue retain global admins, internal-event restrictions and private-data boundaries |

The issue's functional boundary takes precedence over the source's technical sketches. The source's proposed per-event or per-match permissions do not create a new authorization contract. Organizer and match staff remain operational functions of existing admins. The owner's later Arena and shared-screen clarifications refine the earlier source.

## Adopted decision map

| Topic | Adopted decision | Owning rules and acceptance examples |
| --- | --- | --- |
| Shared application | Conduction belongs to the existing application, supports multiple tournaments and keeps sporting information separate from private registration data | TC-001–006, TC-AC-001/002/017/019, RES-003/004/011 |
| Check-in | Organizer marks present participants. It does not automatically change registration, eligibility, pairs or WO. Existing minor safeguards remain | TC-007, TC-AC-003/018 |
| Arena | Required number, optional name, configurable during event creation/preparation | TC-008, TC-AC-004 |
| Arena allocation | Cyclic allocation in ordered Arena sequence, continuing across added matches/rounds. No Arena draw or duration optimization | TC-009, TC-AC-005/006 |
| Calls | Staff call the next match from each Arena queue. No invented automatic absence result or external notification system | TC-010, TC-AC-007 |
| Monomachia format | Seven Swiss rounds, four qualifiers, a six-match round-robin final and top-three podium | MONO-006/016/017/021, MONO-AC-005/013/014 |
| Bounds and ending | 1/3/3 scoring, zero-score valid versus inconclusive, 180 seconds or seven valid bounds, explicit pause and result confirmation | MONO-007–009, TC-014–018, MONO-AC-006–008 |
| Discipline | Verbal pairs within a match, yellow pairs across the tournament, yellow score deductions, red WO plus ranking deduction and expulsion at the second red | MONO-010–012/020, MONO-AC-009/010/017/018 |
| Ranking | Exact victory formula, 0.5 draw, zero defeat, fixed bye/WO credits, negative values and phase-local deductions | MONO-013–015/017, MONO-AC-011/012/014 |
| Tie-breaks | First blood, 3-point-bound count, first-valid-point duels and then age. For three or more tied, minigroup wins precede age | MONO-014/018/019, MONO-AC-012/015/016/019 |
| Live consultation | Same sporting composition, admin mutation controls and spectator read-only mode. Each accepted confirmed record is visible provisionally | TC-021/022, RES-008/011/012, TC-AC-012/013, RES-AC-006/010–012 |
| Official and published | Match confirmation feeds official standings. Final publication remains an explicit separate staff action | TC-017/018/023, RES-009, RES-AC-007/008 |
| Corrections | Preserve earlier outcomes and reasons, recalculate effects, identify dependent decisions for explicit review and republish final corrections | TC-019/020, MONO-020, RES-010, TC-AC-014/015, RES-AC-009 |
| Residual exceptions | Duplo WO, simultaneous red and exact birth-date ties have no invented automatic winner. Missing age evidence blocks age-based resolution | MONO-022, TC-023, MONO-AC-019 |

The cyclic allocation continues across added batches to keep the owner's requested count balance. With eight matches and three Arenas, the sequence is `1, 2, 3, 1, 2, 3, 1, 2`, with counts `3, 3, 2`. Forming Swiss opponents is a separate operation and retains the adopted recorded initial draw or supplied seed order.

The public-facing sporting view excludes complete birth dates, registration identifiers, incident reasons, proofs, contacts, documents and internal staff history. Sharing its composition does not share private administrative panels. Internal events remain restricted to members and admins. Existing coverage/youth disclosures under PRIV-Q1 are still prerequisites for real event publication, and are not settled by this prototype.

## Source proposals adopted for the MVP

The owner's adoption includes the detailed Swiss suggestion policy and bye review, restarting final-phase sporting metrics while retaining tournament cards, phase-local red deductions, pre-WO sporting statistics, and explicit handling of published future matches after expulsion. It also includes first-point duels without the regular scoreless time/bound limits, the minigroup for larger ties, and keeping duel sporting credits out of regular standings while preserving discipline.

Operational proposals adopted from the source include draft/confirmation distinction, consistent corrections, review before resuming after removal of an ending bound, history-preserving participant links, refresh conflicts and explicit review of dependent sporting decisions. The production details remain for a later modeling issue. Full entity diagrams, JSON contracts, storage choices and integration credentials are not part of this functional delivery.

## Question disposition

| Question | Disposition |
| --- | --- |
| RES-Q1 | Resolved by the sporting result contents in RES-006 |
| RES-Q2 | Resolved for this MVP by manual staff entry in RES-007. Participant import is not result import |
| RES-Q3 | Resolved by accepted provisional updates in the shared view, with separate official/final states under RES-008/009 |
| RES-Q4 | Correction history, review and in-view updates specified in RES-010. External/automatic correction notification recipients and channels remain deferred under the same question ID |
| PRIV-Q1 / PRIV-Q4 | Remain in their existing owner. Conduction does not settle real disclosure wording, youth coverage readiness or general personal-data correction/deletion processes |
| Sporting exceptional endings | The adopted functional outcome is an explicit organizational decision pending. No extra ranking criterion or arbitrary winner is approved |

## Prototype review contract

The prototype's future entry point must supply opening instructions, scenario selection/reset and direct screen/state links. The groups below identify the functional coverage to be linked by that artifact. They are not claims that a screen exists or has been reviewed.

| Screen group | Review states | Governing rules / acceptance |
| --- | --- | --- |
| COND-WF-01, event preparation | Event context, numbered/named or unnamed Arenas, missing configuration | TC-001/008/009, TC-AC-001/004–006 |
| COND-WF-02, participants/check-in | Fictional/source entry, refresh/link conflict, presence list, existing participation requirements | TC-004–007, TC-AC-003/017–019 |
| COND-WF-03, phases/rounds | Reviewed pairs/bye, unpublished/published, incomplete and completed round | TC-011–013, MONO-016, TC-AC-008/016, MONO-AC-013 |
| COND-WF-04, Arena queues/calls | Cyclic distribution, ordered queue and next athletes | TC-008–010, TC-AC-004–007 |
| COND-WF-05, shared match view | Running, paused, accepted bounds, pending/failed record, read-only spectator, ending conditions | TC-014–018/021/022, MONO-007–012, TC-AC-009–013 |
| COND-WF-06, confirmation/correction | Draft/void, confirmation, reopens, reasons and affected later decisions | TC-017/019/020, MONO-020, TC-AC-011/014/015 |
| COND-WF-07, ranking/advancement | Exact points, cards, bye/WO, cut tie, final entries and podium | MONO-013–022, MONO-AC-011–019 |
| COND-WF-08, following the competition | Published schedule and the shared live sporting screen, internal restriction, unavailable state | RES-004/006/008/011/012, RES-AC-004/006/010–012 |
| COND-WF-09, publication | Provisional, official, final publication and corrected republication | RES-009/010, RES-AC-007–009 |

The reproducible walkthrough must cover preparation and presence, Arenas and calls, multiple bounds and discipline, confirmed ranking, seven qualification rounds, cut ties, four qualifiers, six final matches, podium, authorized spectator consultation and correction impacts. Reviewers can use prepared progression scenarios without entering every match manually. At least one match must support actual simulated recording that changes the same consulted sporting state.

Desktop and phone review, keyboard/focus, overflow, images, console and specification links must be recorded when that artifact is available. The existing application wireframes provide composition references. Current shared design contracts govern branding, geometry and typography. No matching detailed match-operation reference has been claimed.

## Validation record and remaining evidence

| Evidence category | Recorded state on 19 November 2026 |
| --- | --- |
| Source available | Owner-supplied v1.3 was read and fingerprinted |
| Rule adoption | Explicit owner adoption of confirmed rules and MVP proposals, followed by P2/P3 operational clarifications |
| Functional consolidation | Requirements are available in [conduction](../specs/tournaments/conduction.md), [Monomachia rules](../specs/tournaments/events/monomachia-2027.md#conduction-rules) and [results](../specs/tournaments/results.md) |
| Document consistency | Eight documents checked, 118 local links and 33 fragments resolved, 109 rule/acceptance IDs unique and references valid. Three ranking examples, six unique final pairings and the 3/3/2 Arena example checked. The question index retains two current and eleven deferred entries |
| Prototype review | Not performed. No navigable conduction artifact or responsible-person walkthrough is claimed |
| Production verification | Not performed. No production implementation is delivered by this issue |

When the prototype is reviewed, record the actual artifact revision, review date, responsible person's feedback, scenarios exercised, accepted changes and any limits. Requirements adoption does not substitute for the responsible person's walkthrough of the eventual artifact. Never invent a reviewer, meeting, approval or passing runtime result.

## Handoff boundary

The next modeling/decomposition issue consumes the functional specifications, adopted decision map, prototype screen/state links, usage instructions and actual review evidence. It selects technical structure and implementation slices. It must preserve the global admin and event privacy boundaries, review-dependent corrections, exact sporting calculations and accepted-live-record behavior. This record does not create that issue or prescribe its implementation plan.
