# Tournament conduction implementation issue drafts

**Created**: 2026-11-27
**Last updated**: 2026-11-27

These are complete draft issue texts for review. They have not been created on GitHub. Their identifiers D1–D7 are local references, not issue numbers. Replace dependencies with actual issue links if the owner later authorizes publication. This document delivers no production code, migration or data import.

Read the [policy model](tournament-conduction-model.md), [persistence and operation contracts](tournament-conduction-persistence.md), [calculation examples](tournament-conduction-calculations.md), and the approved [conduction](../specs/tournaments/conduction.md), [Monomachia](../specs/tournaments/events/monomachia-2027.md#conduction-rules), and [results](../specs/tournaments/results.md) specifications. The [prototype walkthrough](../specs/design/tournament-conduction/README.md#review-walkthrough) is the visual reference, not an implementation or production authorization model. All drafts reuse the existing tournament and registration system. Guild admins retain global access. Internal-event restrictions and private-field exclusions are invariants. [PRIV-Q1/Q4](../specs/open-questions.md#current-scope-questions) remain real-use privacy follow-ups and [RES-Q4](../specs/tournaments/results.md#deferred-questions) remains a later external-notification decision.

## Dependency order and common verification

| Draft | Independently reviewable outcome | Depends on |
| --- | --- | --- |
| [D1](#d1--configure-and-start-tournament-conduction) | Versioned configuration and locked start | Existing catalog, auth and registration. This model. |
| [D2](#d2--prepare-participants-and-arenas) | Source-based participation, presence and Arena preparation | D1 |
| [D3](#d3--operate-and-confirm-a-match) | Authoritative match, bound, discipline and official-result operation | D1, D2 |
| [D4](#d4--advance-competition-and-publish-results) | Swiss rounds, tie-breaks, final, standings and publication | D1–D3 |
| [D5](#d5--correct-results-and-reconcile-dependencies) | Reasoned corrections with preserved history and explicit reconciliation | D1–D4 |
| [D6](#d6--provide-authorized-live-sporting-consultation) | Shared authorized live and published sporting views | D1–D5 |
| [D7](#d7--deliver-staff-conduction-journeys) | Staff UI and integrated end-to-end journeys | D1–D6 |

Each draft includes tests for its own outcome. Where a backend slice precedes its user interface, verify its public service and API contracts with synthetic persisted fixtures. D7 closes the integrated browser journey. Each future implementation must honor the root and directory-specific `AGENTS.md` files, including review of the applicable rendered design for UI changes. Backend tests use the repository's `compose.test.yml` with a unique project name and `down -v` afterward. Frontend changes use `make test-frontend` and the relevant lint/build checks. Browser journeys follow the [E2E guide](../e2e/README.md), use synthetic data and disposable stacks, and do not run concurrently on the fixed E2E ports. Tests verify observable outcomes and authorization across real boundaries where appropriate. No draft authorizes staging, commits, deployment or automatic issue publication.

## D1 — Configure and start tournament conduction

**Outcome:** An admin can prepare a complete supported sporting configuration for an existing tournament and explicitly start conduction with a reproducible version bound to it.

**Dependencies:** Existing catalog, verified Supabase identity and global admin authorization. No other draft.

**Included:** Backend model, migration and service/API contracts for conduction state, validated policy strategies, draft versions, concurrency receipts, version binding and start lock. Include the Monomachia reference and two independent test configurations with different limits and ordered tie criteria. Scope the rules to each existing tournament. Use the proposed configuration model and decision 0010. Preserve catalog and registration lifecycles.

**Excluded:** Athlete operations, live match UI, arbitrary user-executable rules, unapproved sporting formats, new admin roles and direct changes to managed `auth` objects.

**Contracts:** TC-001–003, TC-011, TC-024–026 and TC-AC-001/002/021/022. The [configuration matrix and lifecycle](tournament-conduction-model.md#binding-and-lifecycle), [API and concurrency](tournament-conduction-persistence.md#application-and-api-contract), MONO-006–022 and ARCH-001–004/009 apply.

**Tasks:**

- [ ] Persist scoped draft versions and an explicit conduction state. Validate supported identifiers, parameter domains, phase references and the complete Monomachia policy on the backend.
- [ ] Implement draft edit and atomic validation/start with revision checks and idempotency. Bind one version without freezing operational actions. Keep later versions and other tournaments independent.
- [ ] Expose admin-only create/read/edit/start operations using existing auth dependencies. Return useful validation, stale-write and locked-configuration errors.
- [ ] Add migration, service, API and concurrency tests. Verify ordinary relational constraints and service-level enforcement without triggers.

**Acceptance and tests:**

- [ ] A valid pre-start edit changes only its tournament. Invalid, unknown, contradictory and incomplete policy values cannot start. The Monomachia configuration fully expresses the approved policies.
- [ ] Concurrent edit/start requests against the same revision have one consistent outcome. Retrying the same start does not create another binding. A changed payload with the same key and a stale new request are rejected.
- [ ] After start, editing the sporting configuration fails even for a future match. A new version or independent tournament edit cannot reinterpret the started tournament. Creating a permitted future round and correcting a record remain possible under the bound version in dependent slices.
- [ ] Two admins can operate both tournaments. Non-admin mutations fail on the backend. Cross-tournament version attachment is rejected.
- [ ] Run the backend Compose tests and clean up the unique test project. Record which integration behavior is deferred to dependent drafts.

## D2 — Prepare participants and Arenas

**Outcome:** Admins can prepare sporting participants from eligible registrations, maintain attendance and configure numbered Arenas without changing registrations or existing sporting history.

**Dependencies:** D1. The pairing and match workflows belong to D3/D4.

**Included:** Tournament-scoped participant source links, refresh report, explicit linking and display override, participation/attendance state, phase entries and numbered Arenas. Provide admin API operations and persistence with same-tournament integrity. Allocate no real participation by name alone. Use the existing eligibility and privacy rules.

**Excluded:** Production bypass of registration eligibility, real result-file imports, new user accounts, shared spectator private fields and automatic WO from absence. Prototype-only fictional entry remains a simulation, not a real eligibility rule under TC-006.

**Contracts:** TC-004–008, TC-AC-003/004/017–019 and PRIV-010. Use the [relationship model](tournament-conduction-persistence.md#persistence-ownership-and-relationships) and [preparation operations](tournament-conduction-persistence.md#application-and-api-contract).

**Tasks:**

- [ ] Implement idempotent eligible-source refresh with created, updated, unchanged and conflicting results, and explicitly link a participant to a same-tournament registration without replacing its identity or history.
- [ ] Preserve homonyms, manual display overrides, existing results and absent source entries. Keep new participants pending sporting inclusion after phase start. Require explicit participation changes for cancellation or withdrawal.
- [ ] Add presence and Arena operations. Preserve registration, capacity, pairing and existing youth checks. Keep minor documents and safety information private.
- [ ] Test source uniqueness, scoped references, simultaneous refresh, retries, conflicts and independent tournaments through the backend API and database.

**Acceptance and tests:**

- [ ] Repeating refresh creates no duplicates or lost history. Two people with the same display name remain distinct. An already linked source, cross-tournament link or conflicting override is reported, not silently merged.
- [ ] A missing source entry does not delete a participant or result. An explicit local name override is not overwritten. A new participant after phase start does not enter a published round automatically.
- [ ] Check-in changes presence only. It neither grants eligibility nor declares WO. Existing minor signed-term and in-person accompaniment checks remain private and independent.
- [ ] Numbered Arenas have optional names and unique numbers within a tournament. No Arena is a valid preparation state but allocation must report the missing configuration. Test one and multiple admins plus non-admin denial.
- [ ] Run the backend Compose tests and clean up the unique test project.

## D3 — Operate and confirm a match

**Outcome:** Staff can call and operate a prepared match with an authoritative clock, confirmed bounds, discipline, exceptional outcomes and an explicitly confirmed result.

**Dependencies:** D1 and D2. Use synthetic persisted phase, round and match fixtures until D4 supplies real generation.

**Included:** Match, clock-event, bound-revision, sanction and official-result persistence and backend operations. Implement the bound policy, warning/card chain, ordinary and exceptional endings, exact match credits, frozen configuration reference, history and operation idempotency. Honor tournament-wide accepted sporting chronology and accepted clock authority. This slice provides the service/API behavior for one match and retains D4/D5 integration points.

**Excluded:** Swiss generation, qualifier decisions, final publication, staff UI and external notifications. Do not silently choose winners for MONO-022 exceptions.

**Contracts:** TC-010, TC-014–019, TC-022/024, TC-AC-007/009–014, MONO-007–015/018–020 and MONO-AC-006–012/015/016/019. Apply [states, clocks and API](tournament-conduction-persistence.md#states-and-accepted-records) and [worked calculations](tournament-conduction-calculations.md#regular-match-and-exact-standings).

**Tasks:**

- [ ] Implement call, start, pause, resume and expiry using persisted server time. Recover after reload or disconnected viewers. A bound does not pause the clock.
- [ ] Save drafts and accept valid bounds with unique occurrence order. Calculate score, first blood, valid count, warnings and cards from accepted revisions and the bound rules. Implement WO, red and pending exceptions without invented scores.
- [ ] Stop for review on time, valid-bound or configured exceptional ending. Reject inconsistent records, unresolved drafts and additional invalid bounds. Confirm a result and its ranking credit once.
- [ ] Serialize conflicting operations, retain idempotency receipts, expose stale conflicts, and write tests using separate sessions for concurrent requests and rollback behavior.

**Acceptance and tests:**

- [ ] Drafts and failed submissions have no sporting effect. Sem Pontuação and Inconclusivo count as specified. Both athletes can receive warnings independently. Negative scores and no-first-blood results remain valid.
- [ ] Start/pause/resume and a fresh read restore the same authoritative remaining time. Expiry after disconnection stops at the original deadline. Recording a bound does not pause. A regular seventh valid bound or expiry enters review before explicit confirmation.
- [ ] Warnings promote once, yellows carry toward tournament reds, phase penalties apply once, and first/second reds produce the specified WO and expulsion. Ordinary WO preserves partial score and fixed credit. Double WO or simultaneous red stays pending.
- [ ] Retrying a bound or confirmation does not duplicate an occurrence, card or credit. A different stale request receives a conflict and does not overwrite the result. Staff from either admin account can operate any match and non-admin mutations fail.
- [ ] Run backend Compose tests with a unique project and clean up. Include equal-time and multi-Arena sporting sequence cases and exact arithmetic assertions.

## D4 — Advance competition and publish results

**Outcome:** Staff can review and publish compliant rounds, advance eligible athletes, resolve sporting ties, run the configured final and separately publish settled results.

**Dependencies:** D1–D3.

**Included:** Phase and round progression, same-phase allocations, cyclic Arena queues and calls, exact standings, Swiss pairings/byes, relevant tie duels/minigroups, qualification, final entries and schedule, podium and versioned publication. Generate later competition under the bound configuration. Provide service/API operations and synthetic integration fixtures.

**Excluded:** Changing rules after start, new formats beyond the documented strategies, automatic winners for unresolved exceptions, external ratings/results imports, general notifications and frontend journeys.

**Contracts:** TC-008–013/018/023/026 and TC-AC-004–008/015/016/020/022. MONO-006/013–019/021/022, MONO-AC-005/011–016/018/019 and RES-006–009 apply. See [Swiss and progression](tournament-conduction-calculations.md#swiss-pairing-and-progression), [sporting ties](tournament-conduction-calculations.md#sporting-ties-and-unresolved-cases) and the [operation contracts](tournament-conduction-persistence.md#application-and-api-contract).

**Tasks:**

- [ ] Generate repeat-minimizing Swiss suggestions with exact points, bye fairness, viability and deterministic recorded initial order. Require explicit staff approval when repeats are unavoidable.
- [ ] Review pairings and byes before publication. Enforce same-phase distinct participants, one allocation per round and no ordinary opponent replacement after start. Allocate cyclically across Arenas using the persisted cursor.
- [ ] Complete rounds only after official results and confirmed byes. Calculate exact standings and create separate tie-break rounds that do not consume regular rounds or add regular credits. Handle relevant ties and sanctions, pending decisions and eligibility.
- [ ] Confirm four Monomachia qualifiers after seven regular rounds and required ties. Create the configured six-match, three-round final with reset phase statistics and carried cards. Confirm an eligible podium and publish a distinct revision only after prerequisites are settled.

**Acceptance and tests:**

- [ ] Eight matches across three Arenas allocate `1,2,3,1,2,3,1,2` in one or multiple batches. No Arena blocks allocation. A missing presence mark or call response does not produce a WO.
- [ ] Odd-field byes, no-repeat solutions and unavoidable repeat approval follow MONO-016. No participant receives both a match and a bye, faces themself or an entry from another phase. Incomplete or stale predecessor data blocks publication.
- [ ] Exact credit ordering and tie criteria match the worked examples. A two-person duel ends on its first valid scoring attack. A three-person cycle uses duel wins then verified age. Missing/equal dates, double WO and simultaneous reds remain pending without an invented winner.
- [ ] After seven rounds and resolved cut ties, four eligible finalists receive separate phase standings. The three documented rounds contain six unique pairings. Disqualified athletes are ineligible. Existing published future matches become opponent WOs under the adopted rules without repeating penalties.
- [ ] No official result appears in standings before confirmation. A complete podium and settled dependencies are required for a separate final-publication revision. Test multiple tournaments and all operations under the bound configuration.
- [ ] Run backend Compose tests with a unique project and clean up. Cover competing publication/progression requests and repeated bye or qualifier confirmation.

## D5 — Correct results and reconcile dependencies

**Outcome:** Admins can reopen and correct sporting records without losing earlier results, and explicitly reconcile the effect on later decisions before republication.

**Dependencies:** D1–D4.

**Included:** Reasoned correction, void, reopen, preserved bound and result revisions, chronology revisions, recalculation of affected sanctions/standings, dependency-review records, explicit reconciliation and publication revisions. Support corrections under the frozen configuration, including after event completion.

**Excluded:** Automatic replacement of published or started pairings, reopening approved sporting policy, automatic external notifications, arbitrary fallback winners and a general-purpose audit system.

**Contracts:** TC-016/017/019/020/022/026, TC-AC-011/013–016/022, MONO-011/019/020/022 and MONO-AC-007/010/016/017/019. RES-009/010 and RES-AC-008/009 apply. See [chronology](tournament-conduction-calculations.md#sporting-chronology-and-cards) and [correction and republication](tournament-conduction-calculations.md#correction-clock-and-republication).

**Tasks:**

- [ ] Reopen with actor, time and reason. Preserve earlier accepted bounds, result and publication revisions. Revise an occurrence in its original sporting position or record a reasoned order correction.
- [ ] Rebuild candidate score, first blood, warning promotions, cards, standings and dependent eligibility under the original configuration. Mark affected later matches, tie resolutions, qualifiers, final entries and podium decisions for review.
- [ ] Require explicit confirmation, reconciliation and republication as distinct steps. Keep published/started match identities and previous publication versions visible as under review.
- [ ] Implement correction-created endings and explicit return to paused when an ending is removed. Serialize mutations and test duplicate/stale submissions and failures atomically.

**Acceptance and tests:**

- [ ] In reverse-created minigroup duels, playing the later-created duel first and confirming it keeps its result intact when a second yellow in the later-played duel creates a red there. Cover equal and distinct timestamps and reload. Correcting the first played duel marks the later result and tie group for review.
- [ ] A correction creating a seventh valid bound, a red or the first scoring duel attack stops a running **or** paused clock for explicit confirmation. A correction with no ending preserves running/paused state. Removing an ending requires explicit return to paused and a separate resume. An eighth valid bound is rejected.
- [ ] Void removes associated warnings. Inconclusive retains applicable warnings. Recalculation adds no duplicate deduction, credit or red. Correction reversing expulsion marks its future effects for review.
- [ ] Reopening a published result retains R1/P1. Confirming R2 does not silently change later decisions. Affected confirmations and publication remain blocked until explicit reconciliation. Republication creates P2 and leaves P1 identifiable as under review or superseded.
- [ ] Retry with the same idempotency key returns the same revision. A stale or failed correction creates no accepted revision. Run backend Compose tests and clean up the unique project.

## D6 — Provide authorized live sporting consultation

**Outcome:** Eligible players and spectators can follow released schedules, accepted bounds and provisional scores, official standings and final publications through a read-only shared sporting view.

**Dependencies:** D1–D5. Real publication remains subject to the unresolved privacy readiness decisions, not resolved by fictional fixtures.

**Included:** Backend scoped sporting projections, existing audience authorization, polling/freshness and clock recovery, and a read-only frontend journey. Distinguish unavailable, restricted, provisional, review, official and published states. Follow [COND-WF-09](../specs/design/tournament-conduction/README.md#screens-and-scenarios), WF-14 and application design references.

**Excluded:** Staff mutation controls, new roles, private registration or incident panels, image/voice capture, automatic result notifications and changes to managed identity data.

**Contracts:** TC-003/018/020–022, TC-AC-012/013/015, RES-001–012 and RES-AC-001–012, PRIV-004/006/010. Use the [projection and polling contract](tournament-conduction-persistence.md#concurrency-time-and-projections).

**Tasks:**

- [ ] Expose only the authorized tournament's released sporting projection. Use the same accepted match composition for staff and spectators, without returning private fields or controls to read-only clients.
- [ ] Implement permitted live updates and authoritative clock display, preserving explicit stale/unavailable feedback and recovery after a failed poll or reload.
- [ ] Show provisional bounds after acceptance, official standings after confirmation and final publication as distinct states. Show under-review and corrected publication revisions without presenting obsolete results as current.
- [ ] Implement responsive, accessible consultation consistent with rendered references, themes and vocabulary. Test backend access controls and frontend state rendering. Add focused synthetic browser coverage.

**Acceptance and tests:**

- [ ] Guest access works for released non-internal events and is rejected for internal events. Members/admins can consult an internal event. A competitor is not automatically a member. Non-admin users cannot mutate.
- [ ] The accepted bound and provisional score appear without a separate release action. Draft, pending, failed and rejected actions never appear accepted. A retry does not duplicate the view. An unconfirmed match does not contribute official credit.
- [ ] Final publication is distinct from a live or official result. Reopening displays under-review state and corrected publication requires reconciliation and a separate action.
- [ ] Responses and rendered views exclude registration identifiers, contact and payment data, proofs, full birth dates, private reasons and staff history. Switching events cannot leave the previous event's result as current.
- [ ] Stale/unavailable polling is visible. On session recovery the backend clock anchor is used, not a restarted client timer. Test desktop/mobile and both themes as required by frontend instructions. Run backend Compose, frontend checks and relevant disposable E2E journey.

## D7 — Deliver staff conduction journeys

**Outcome:** Guild staff can operate the complete configured tournament through the authenticated application, from preparation through final publication and correction, using the existing global admin role.

**Dependencies:** D1–D6. The backend remains authoritative for every rule and access decision.

**Included:** Staff screens and integration for configuration/start, participants, refresh conflicts and check-in, Arenas and calls, round review, match controls and bounds, result confirmation, standings, tie-breaks, progression, reconciliation and publication. Provide loading, empty, error, failed-submit and stale-conflict states. Follow [COND-WF-01–08](../specs/design/tournament-conduction/README.md#screens-and-scenarios), the relevant rendered references and application vocabulary.

**Excluded:** A duplicate tournament system, event-specific staff grants, a general rules language, real data import, production rollout and unapproved formats. Fictional test participants stay within test or prototype contexts and do not bypass real registration eligibility.

**Contracts:** TC-001–026 and TC-AC-001–022, MONO-006–022 and MONO-AC-005–019, RES-006–012 and RES-AC-006–012. Use the [review walkthrough](../specs/design/tournament-conduction/README.md#review-walkthrough) and the three technical-model documents linked above.

**Tasks:**

- [ ] Build responsive, accessible staff workflows around the existing tournament context. Display missing preparation, source-refresh and link conflicts, locked configuration and pending inclusion. Use backend-authoritative state.
- [ ] Support Arena queues, calls, match clock and draft/confirmed bounds, warnings, WO, confirmation and official standings. Make failed, pending, stale and restricted states clear without claiming an unsaved operation succeeded.
- [ ] Support review and publication of pairings/byes, tie decisions, qualifier and final progression, podium and final publication. Provide reasoned correction, affected-decision review and explicit reconciliation.
- [ ] Add focused frontend tests and a synthetic end-to-end journey through existing application boundaries. Reuse the shared spectator composition and protect staff controls with backend authorization.

**Acceptance and tests:**

- [ ] An admin prepares an existing tournament, checks in athletes, configures Arenas, reviews pairings/bye and calls a match. A second global admin can continue the same operation. Missing presence alone does not create WO.
- [ ] A match records multiple bounds, warnings and an official result. Reload, pause/resume, failed save, retry and stale conflict show the accepted state correctly. An eligible spectator sees accepted provisional bounds without staff controls.
- [ ] A synthetic tournament exercises seven rounds, a required tie-break, four qualifiers, the six-match final, podium and separate publication. A correction after publication preserves prior results and requires visible reconciliation before republication. Cover the two PR #104 regressions in appropriate backend tests and an observable correction journey in E2E.
- [ ] Verify public/internal access, private-data exclusions and minor safeguards across staff and shared views. Check desktop/mobile layouts, light/dark themes, keyboard and focus behavior against the applicable rendered design.
- [ ] Run frontend tests and relevant lint/build checks, backend Compose tests for changed behavior, and a focused disposable E2E stack. Run the full E2E suite when the complete journey is integrated. Report any unavailable check and clean up stacks.

## Flow and rule ownership

The map assigns a primary implementation owner. Later UI and integration verification in D7 exercises the backend contracts. D6 owns the shared spectator composition. Existing prototype-only TC-006 and TC-AC-017 remain evidence for fictional demonstration, not permission to introduce real registration bypass.

| Approved flow or rule | Primary draft and verification |
| --- | --- |
| Event isolation and configuration lifecycle: TC-001/024–026, TC-AC-001/021/022 | D1 tests bound versions and independent events. D4/D5 exercise later rounds and corrections. |
| Global admin access and privacy: TC-002/003, TC-AC-002/018, RES-001–005/011, RES-AC-001–005/010/011 | D1/D2 enforce mutations and participation checks. D6 tests audience and projection. D7 verifies integrated controls. |
| Participants and presence: TC-004–007, TC-AC-003/017–019 | D2 verifies source identity, refresh, linking, check-in and private minor safeguards. The existing prototype remains the TC-006 fictional demonstration. |
| Arenas, queues, calls, pairings and byes: TC-008–013, TC-AC-004–008, MONO-016 and MONO-AC-013 | D2 owns Arena setup. D4 owns pairing, allocation and round publication. D7 exercises the visible flow. |
| Clock, bounds, results and standings: TC-014–018/022, TC-AC-009–013, MONO-007–015 and MONO-AC-006–012 | D3 owns match operations. D4 owns standings and byes. D6/D7 exercise accepted, failed and read-only states. |
| Corrections, chronology and reconciliation: TC-019/020, TC-AC-014/015, MONO-011/020 and MONO-AC-010/017 | D5 owns historical revisions, the two regression cases and dependent review. D6/D7 surface the consequences. |
| Consultation and publication: TC-021, RES-006–012, RES-AC-006–012 | D4 publishes settled results. D5 handles republication. D6 tests permitted live views and privacy. D7 verifies the staff journey. |
| Qualification, ties, final and completion: TC-023, TC-AC-016/020, MONO-006/017–019/021/022 and MONO-AC-005/013–016/018/019 | D4 owns progression, eligibility, tie-breaks and pending exceptions. D5 handles changed outcomes. D7 covers the complete synthetic journey. |

Together these entries cover the #91 preparation, check-in, organization, calls, match/bound, ranking, advancement, correction, publication and player/spectator journeys. Pools and brackets were organization possibilities in #91, not an instruction to insert unapproved formats into Monomachia. TC-011 and MONO-006 establish Swiss qualification and round-robin final for this MVP.

## Issue #105 acceptance map

| Required modeling outcome | Repository evidence and implementation ownership |
| --- | --- |
| Implementable without chat, the private sketch or prototype object shapes | [Policy model](tournament-conduction-model.md), [persistence and operations](tournament-conduction-persistence.md), [calculations](tournament-conduction-calculations.md), and D1–D7 above. The source sketch disposition states what is kept, adapted or rejected. |
| Two isolated fictional championships with different limits and tie order, plus complete Monomachia reference | [Policy matrix](tournament-conduction-model.md#policy-matrix) and [worked comparison](tournament-conduction-calculations.md#two-configurations-different-outcomes). D1 validates configuration and D3/D4 implement consequences. |
| Pre-start validation, atomic start and post-start lock, including future matches and independent events | [Binding lifecycle](tournament-conduction-model.md#binding-and-lifecycle) and [application contracts](tournament-conduction-persistence.md#application-and-api-contract). D1 tests races and lock. D4 and D5 exercise later operations. |
| Frozen policy permits later competition and corrections with history and explicit reconciliation | [Operations states](tournament-conduction-persistence.md#states-and-accepted-records) and [correction example](tournament-conduction-calculations.md#correction-clock-and-republication). D4/D5 own behavior. |
| Relationships, state, API, concurrency, idempotency, clock and live projection agree | [Persistence and operations](tournament-conduction-persistence.md) and [calculation boundary](tournament-conduction-calculations.md#inputs-and-calculation-boundary). D1–D6 test their respective boundaries. |
| Ordinary play, WO, ties, progression, duplicate/stale submissions, recovery and corrections, including both PR #104 regressions | [Worked calculations](tournament-conduction-calculations.md) and [representative exchanges](tournament-conduction-persistence.md#representative-exchanges). D3–D7 assign backend and integrated checks. |
| Every mandatory #91 flow and configuration requirement has a complete draft and dependencies | [Dependency order](#dependency-order-and-common-verification), D1–D7, and [flow ownership](#flow-and-rule-ownership). The drafts are not GitHub issues. |
| Global admin, internal access and private-data exclusions remain fixed invariants | [Context and ownership](tournament-conduction-model.md#context-and-ownership), [projection contract](tournament-conduction-persistence.md#concurrency-time-and-projections), D1/D2/D6/D7. No new role or duplicate tournament is proposed. |
| Delivery is documentation/specification only | This issue's diff contains the model, specification updates, entry points and drafts. Production implementation, migrations, live data, deployment and issue publication are excluded. |
