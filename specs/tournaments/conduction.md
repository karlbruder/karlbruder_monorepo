# Tournament conduction

**Created**: 2026-11-19
**Last updated**: 2026-11-19

| Field | Value |
| --- | --- |
| Status | Draft, functional direction adopted by the product owner on 19 November 2026 |
| Scope | Planned tournament extension. Issue #91 delivers specifications and a simulated prototype |
| Applications | frontend, backend |
| Sources | [Issue #91](https://github.com/karlbruder/karlbruder_monorepo/issues/91), TournamentConduction source v1.3 and the owner's clarifications recorded in the [validation record](../../docs/tournament-conduction-validation.md) |

## Goal

Let guild staff prepare and conduct a tournament, record each bound during a match, and follow the consequences through standings, qualification and final publication. Players and spectators follow the same sporting information through a read-only presentation within the event's access boundary.

## Scope and boundaries

TournamentConduction belongs to the combined frontend/backend application. Existing tournament, registration, identity, payment, consent and privacy capabilities retain their responsibilities. Monomachia is the first ruleset, defined in its [event specification](events/monomachia-2027.md#conduction-rules). Other events may use different formats and sporting policies.

This specification owns preparation, attendance, Arenas, calls, phase/round/match/bound operation and the effects of corrections. [Results](results.md) owns consultation, provisional information, publication and the permitted audience. Event specifications own scoring, discipline, pairing and ranking policies. [Privacy](consent-and-privacy.md) owns personal data, acceptance, coverage disclosures and youth safeguards.

Issue #91 does not deliver production features, API contracts, detailed entity models, database schema, migrations, real integrations or implementation issues. Its prototype uses fictional participants and simulated interactions. Match staff and organizer are operational functions, not new authorization roles.

## Vocabulary

| Concept | Meaning |
| --- | --- |
| Tournament | The selected event and its conduction, participants and adopted rules |
| Phase | A competition stage with its own format, entries and standings |
| Round | An ordered set of matches and any bye within one phase |
| Match / luta | A contest between two distinct participants in the same phase |
| Bound | The product owner's term for one assault occurrence within a match. An inconclusive occurrence remains a record even when it does not consume the valid-bound limit |
| Arena | A numbered competition area with an optional name. Use **Arena** in product copy |
| Check-in | The organizer marks present participants on the list |
| Bye | A round allocation without an opponent, governed by the event's ranking policy. It is not a fictional match |
| Organizer / match staff | Functions performed using existing guild staff (admin) access |
| Player / spectator | A person consulting the permitted sporting view, without administrative permissions |

## Rules

### Preparation and participation

- **TC-001:** Conduct each tournament in its own context. Participants, phases, results and Arenas from another event must not enter its competition. Formats are reusable capabilities rather than a separate Monomachia system.
- **TC-002:** Guild staff (admins) can configure and operate all tournaments under AUTH-008 and ADM-001. The organizer prepares the event and match staff conduct matches. Assigning a match or Arena organizes work and must not require a grant or prevent another admin from operating it.
- **TC-003:** Apply RES-003/004 and PRIV-004/006/010 to all conduction views. Shared sporting information does not authorize private registration data. Existing disclosure and youth requirements remain applicable before real publication. A simulated role switch is not production authorization.
- **TC-004:** Maintain a participant's identity and sporting history within the tournament. Display names are not unique identifiers. Withdrawal or disqualification preserves history. A later explicit link to an existing registration preserves the participant's results and must expose conflicting links rather than merge by name.
- **TC-005:** Preparing or refreshing participants from eligible registrations must not duplicate the same source registration, delete absent entries or erase results. Show created, updated, unchanged and conflicting entries. Cancellations require an explicit participation change. Local display-name overrides must be explicit and must not be silently overwritten. After a phase starts, new entries remain pending sporting inclusion and must not enter published rounds automatically.
- **TC-006:** The prototype allows fictional participants without accounts or real registrations, including quick name entry, a reviewed list of names and generated test participants. Test origin is visible to staff. Repeated names may warn without forcing a merge. Removing a participant with sporting history must preserve that history. These demonstration actions do not authorize real participation that bypasses registration eligibility.
- **TC-007:** Check-in is a basic presence mark made by the organizer on the participant list. It does not change registration status, assign capacity, grant eligibility, declare WO or change published opponents automatically. Existing participation requirements still apply. For minors, preserve private signed-term checks and in-person verification of the minor and accompanying parent under PRIV-010, without additional identity-document uploads.

### Arenas, organization and calls

- **TC-008:** The organizer can configure n Arenas when creating or preparing the event. Each Arena requires a number and may have a name. Present “Arena 1 · Arena bonita” when named and “Arena 2” when unnamed. At least one Arena is needed to allocate matches. An event with none can remain in preparation and must identify the missing configuration.
- **TC-009:** Allocate the ordered sequence of matches cyclically across the configured order of Arenas. Continue the cycle as later matches or rounds are added. Preserve each Arena's relative match order. With the same Arenas, their total allocated match counts differ by at most one. Do not draw Arenas randomly or optimize assignments by athlete strength or estimated duration. Arena allocation is separate from pairing opponents.
- **TC-010:** Present each Arena's ordered queue, current match and next match's athletes. Staff call and start the next match explicitly. Absence of a presence mark or a call response does not introduce an automatic WO, timeout or external notification service. Any exceptional result follows the adopted event policy and an explicit staff decision.
- **TC-011:** Configure phases, formats, round counts and qualification according to the event rules. A final phase refers to the same tournament participants while keeping its own sporting entries and standings. The Monomachia MVP requires Swiss qualification and a round-robin final. Organization views may show rounds, groups and brackets where appropriate, without inserting an unapproved pool or knockout phase.
- **TC-012:** A participant cannot face themself, an entry in another phase, or simultaneously receive a bye and a match in the same round. Staff review pairings and byes before publication. Manual edits follow the same sporting constraints and retain the reason/history. Once a match starts, ordinary editing must not replace its athletes.
- **TC-013:** Publishing a round releases its schedule within the event's permitted audience. Draft pairings remain staff preparation. Completing a round requires all its match results to be official and any byes to be confirmed. Publication of later rounds and confirmation of qualifiers follow the event's dependency rules.

### Match and bound operation

- **TC-014:** Staff explicitly start, pause and resume a match. Recording a bound does not pause the clock. Reloading or returning to an ongoing match must not restart its time. The accepted match clock is authoritative for all views. Preserve pause/resume history. The prototype simulates this contract without implementing a server or selecting time-storage mechanics.
- **TC-015:** A bound records its order in the fight, scoring side or no side, result type, and any warning to either, both or neither athlete. Validate combinations against the adopted event rules. Distinguish draft, confirmed and voided records. Only confirmed records affect scoring, valid-bound count and discipline. Preserve inconclusive and voided history without reusing an occurrence's order.
- **TC-016:** Derive score, valid-bound count, first blood, discipline and result from the confirmed records and adopted rules. A correction or void recalculates the connected effects consistently. Voiding an occurrence also removes its associated warning effects. Making a real occurrence inconclusive does not automatically remove its warnings. Deductions do not invent a scoring attack or a first blood.
- **TC-017:** Reaching a regular or exceptional ending condition stops the clock and moves the match to result review. Review is not permission to continue fighting. Confirmation requires an applicable ending condition, consistent records and no unresolved drafts. Only an explicit staff confirmation makes the result official. Reconfirming the same accepted result must not duplicate ranking credit.
- **TC-018:** Provisional score and bounds are available for permitted live consultation after each accepted confirmed record. A match awaiting result confirmation does not feed the official ranking. Confirmed match results, confirmed byes and applicable disciplinary adjustments determine official standings according to the event policy. Clearly label provisional, awaiting confirmation and official information.
- **TC-019:** Staff can correct or void records and reopen official results with a reason. Preserve who changed what and when, the earlier result, and the reason. An action that occurred within fight time can be completed during review without awarding extra fight time. Reopening retains the same match and disciplinary history. This sporting history does not impose a general administrative audit requirement beyond ADM-005.
- **TC-020:** Recalculate affected standings and disciplinary progression after a correction. Identify affected later pairings, tie resolutions, qualifiers, final entries and podiums as needing review. Do not silently replace published or started matches. Block dependent confirmation/publication until staff explicitly reconcile the impact. A previously published version remains identifiable as under review until the corrected outcome is confirmed and republished.

### Shared view and consistency

- **TC-021:** Staff and eligible spectators use the same sporting composition for a match, including athletes, Arena, clock, score, bound history and sporting status. Staff have editing actions and spectators have read-only access. Private administrative panels are outside that shared projection. An accepted new record or correction updates the authorized consultation without a separate live-release action for each bound. Final publication remains distinct under RES-009.
- **TC-022:** Retried submissions must not duplicate a bound, promotion, result confirmation or import. Pending or failed operations must not appear accepted. Concurrent stale edits must show a conflict and require refreshing the state instead of silently overwriting another staff member's work. Describe these observable guarantees without choosing request formats or synchronization technology in this issue.
- **TC-023:** Confirm qualifiers only from completed, eligible results and resolved relevant ties. Complete the tournament only after its required phases and podium decisions are settled. An unresolved sporting exception remains a visible organizational decision and blocks dependent confirmation rather than inventing a winner. Staff separately publish final results.
- **TC-024:** Keep the adopted rules used for a match and result identifiable. Later rule changes must not silently reinterpret already official history. The prototype identifies the Monomachia policy and its approved examples without prescribing technical ruleset version storage.

## User flow or contract

### Operational journeys

1. **Organizer:** select or prepare the existing tournament, configure Arenas and phases, prepare fictional or eligible-source participants, mark presence, review pairings/byes, publish the round and inspect Arena queues. Confirm phase completion, qualifiers and final publication.
2. **Match staff:** use an admin-signed-in computer, select the next Arena match, call the athletes, start/pause/resume, record and review bounds, confirm the result and inspect its ranking effect. Correct or reopen with a reason and reconcile dependent information when necessary.
3. **Player:** open the selected event's permitted schedule, their match, its individual bounds and provisional score, and the phase ranking. Confirmed and published results remain distinguishable. Being a competitor does not grant access to an internal event outside the membership boundary.
4. **Spectator:** consult the same sporting match view in read-only mode and follow new accepted records, standings and published outcomes. A guest can follow released non-internal information. A guild member or admin can follow an internal event within RES-004. Unavailable and restricted states do not expose private data.

### Preparation, phase and round transitions

State labels describe functional expectations. They are not a database schema. All mutations in this table belong to staff. “Needs review” identifies a dependent decision that cannot currently be confirmed, rather than silently changing a finished result.

| Object / current state | Action and precondition | Result and effect | Audience / failure |
| --- | --- | --- | --- |
| Tournament draft | Configure participants, Arenas, phases and adopted rules | Preparation can proceed toward ready | Staff. Missing required preparation remains visible |
| Participant list | Organizer marks a person present | Attendance changes only | Staff. Registration status and results stay separate |
| Unallocated ordered matches | Allocate with at least one configured Arena | Cyclic assignments and per-Arena queues | Draft is staff-only. Zero Arenas reports missing configuration |
| Phase draft | Review its configured format and entries | Phase ready | Staff. Cross-event or duplicate conflicting entries cannot create valid matches |
| Round draft | Review pairings, bye and Arena allocation, then publish | Round published and schedule released | Eligible audience. Invalid pairs or an unmet preceding-round dependency block publication |
| Match next in Arena queue | Staff call athletes | Called/current preparation is identifiable | Released schedule. Absence does not decide a result automatically |
| Published round / ready phase | Start its matches | Round and phase running | Accepted records become provisional sporting information |
| Running round | Confirm all results and byes | Round completed and next-round dependencies satisfied | Official standings update. Incomplete results keep the round open |
| Running qualification phase | Complete required rounds and resolve relevant ties | Phase completed and qualifiers confirmable | Unresolved cut ties or ineligible athletes cannot be silently advanced |
| Final preparation | Confirm qualifiers and final entries | Final ready with its own standings policy | Relevant inherited cards remain effective under event rules |
| All required phases settled | Confirm podium and complete tournament | Tournament completed | Final publication is a separate staff action |
| Tournament draft, ready or running | Staff cancel the event | Tournament cancelled, history retained | Cancellation does not create fictional match wins or alter registration/refund policy |

### Match and bound transitions

| Current state | Action / guard | Next state and sporting effect |
| --- | --- | --- |
| Scheduled match | Staff prepare and call its two athletes | Ready. Existing participation requirements still apply |
| Ready | Staff start | Running. Clock begins under the adopted rules |
| Running | Staff pause | Paused with remaining time preserved |
| Paused | Staff resume | Running from the remaining time |
| Running or paused | Save a bound draft | Bound draft, without official sporting effects or spectator publication |
| Bound draft | Confirm a valid occurrence | Bound confirmed. Recalculate score, discipline and count. Accepted record is visible provisionally |
| Confirmed bound | Correct with history or void the mistaken occurrence | Updated confirmed or voided record, with consistent recalculation and review of any later impact |
| Running | Time or valid-bound ending limit reached | Awaiting confirmation. Stop clock and record ending reason |
| Running or paused | A record reaches an adopted bound or first-valid-point ending condition | Awaiting confirmation, with no automatic further combat |
| Scheduled, ready, running or paused | Explicit exceptional WO decision or disciplinary ending | Awaiting confirmation with exceptional reason. No invented score |
| Awaiting confirmation | Staff settle/discard drafts and confirm a consistent ending | Finalized. Official ranking can incorporate the result once |
| Finalized | Staff reopen with a reason | Result under review, with candidate corrections awaiting confirmation and dependent decisions marked for review |
| Awaiting confirmation after bound-limit ending | Correction removes the ending bound and time remains, where event rules allow | Explicit audited return to paused. Another explicit action is required to resume |
| Match before an official result | Administrative cancellation | Cancelled with history retained, without automatic sporting win, draw or ranking credit |
| Result / dependency under review | Staff reconcile, confirm and republish as applicable | Corrected official state and explicit release of dependent confirmations |

### Arena allocation example

With three configured Arenas and eight ordered matches, allocate to Arenas `1, 2, 3, 1, 2, 3, 1, 2`. The queues contain three, three and two matches. Adding those matches as two batches of four has the same result because the cycle continues between batches. With one Arena, every match belongs to it. More Arenas than matches leave some queues empty and never duplicate a match.

This rule balances counts across the fixed configured set. It does not choose opponents, simulate a Swiss draw or promise identical running times. Published assignments are not silently regenerated by a correction.

### Functional integration

Use the existing tournament as context and eligible registrations as the real source of participants. Conduction owns sporting occurrences, progression and results. It does not import proofs, contact details or safety notes merely to create pairings. A refresh uses source identity, preserves history and reports conflicts. A manual participant can be explicitly linked without losing results. Withdrawal is explicit and never inferred from a missing refresh entry.

The prototype provides quick fictional entry and a simulated import through the same functional journey. Importing participants is not importing match results. Production transport, external credentials and result-import support remain separate later decisions.

## Acceptance criteria

- **TC-AC-001:** Given two tournaments, when staff prepare or operate one, then its participants, Arenas, rounds and results remain separate from the other.
- **TC-AC-002:** Given two guild admins, when either operates an event or another admin's current match, then no event-specific or match-specific grant is required. A non-admin cannot mutate the competition.
- **TC-AC-003:** Given the presence list, when the organizer marks an athlete present, then the mark is visible to staff without changing registration status, capacity, published pairings or a match outcome.
- **TC-AC-004:** Given an unnamed Arena and a named Arena, when displayed, then each shows its number and only the named one adds a name. Missing Arena configuration prevents allocation without losing preparation work.
- **TC-AC-005:** Given eight ordered matches and three Arenas, when allocated together or in two batches, then the sequence is 1, 2, 3, 1, 2, 3, 1, 2 and the counts are 3, 3, 2. Each match appears once and each queue preserves order.
- **TC-AC-006:** Given one Arena or more Arenas than matches, when allocating, then all matches are assigned once, without random draws or fictional extra matches.
- **TC-AC-007:** Given an Arena queue, when staff call its next match, then the athletes and Arena are identifiable. Missing presence alone does not generate a WO.
- **TC-AC-008:** Given a participant already in a round, when pairings are reviewed, then self-pairing, a different phase's opponent, or a simultaneous bye and match cannot be published as valid.
- **TC-AC-009:** Given a running match, when staff record a bound or pause, resume and reload, then recording does not pause time and reloading does not restart the match clock.
- **TC-AC-010:** Given draft, confirmed, inconclusive and voided bounds, when viewing sporting totals, then only applicable confirmed occurrences contribute. Inconclusive records remain in history according to the ruleset's counting policy.
- **TC-AC-011:** Given an ending condition and unresolved drafts, when staff attempt confirmation, then confirmation requires settling those drafts and consistent records. Repeating the accepted confirmation never duplicates its ranking effect.
- **TC-AC-012:** Given the staff and spectator views of the same match, when staff confirm a new record, then the spectator sees the accepted bound and provisional score through the same sporting composition, without editing actions or a separate live-release step.
- **TC-AC-013:** Given pending, failed, retried or stale edits, when recording a bound, then the view does not announce false acceptance, duplicate an effect or silently overwrite a concurrent accepted change.
- **TC-AC-014:** Given an official match, when staff reopen and correct it with a reason, then earlier and revised outcomes, actor and reason remain identifiable and the affected ranking and discipline are recalculated.
- **TC-AC-015:** Given a correction affecting a published round, qualifiers or podium, when reviewing its consequences, then the dependency is marked for review, its published matches are preserved and dependent confirmation waits for explicit reconciliation.
- **TC-AC-016:** Given a round or phase with incomplete official results or a required unresolved tie, when attempting to complete or confirm qualifiers, then the unresolved prerequisite is identified rather than inventing an outcome.
- **TC-AC-017:** Given a fictional participant or repeated simulated import, when preparing the prototype, then no real account is required, source duplicates are not created, homonyms are not automatically merged and existing sporting history is retained.
- **TC-AC-018:** Given a minor whose existing participation requirements are not met, when presence is marked, then that mark does not override the signed-term and accompaniment requirements or expose their private documents.
- **TC-AC-019:** Given a participant refresh after phase start, when a new source entry appears or an earlier one is absent, then no published pairing is silently changed and no existing result or participant is deleted by omission.
- **TC-AC-020:** Given the Monomachia MVP, when the functional walkthrough is reviewed, then it covers preparation, Arena calls, multiple bounds, discipline, ranking, qualification, final and publication using the event's adopted rules and the permitted spectator view.

## Implementation baseline

This document records intended behavior for issue #91 on 19 November 2026. No production conduction implementation or runtime verification is claimed. The new navigable prototype and its review evidence are subsequent deliverables. Existing WF-14 is an earlier results container, not proof of detailed match-operation behavior. The [validation record](../../docs/tournament-conduction-validation.md) distinguishes adopted rules from future prototype review.

## Open questions

None blocking the specified Monomachia prototype flows. Cases without an automatic sporting outcome remain visibly pending under MONO-022. Real youth disclosure and publication readiness remain owned by PRIV-Q1, not resolved by fictional prototype data.

## Deferred questions

External correction notifications remain under [RES-Q4](results.md#deferred-questions). Other formats, result import and external integrations do not expand the Monomachia MVP. Do not add future capabilities to meet an invented completeness target.

## Implementation decisions

The later modeling stage selects persistence, APIs, synchronization and concurrency mechanics. It must preserve the observable contracts above. The prototype may use reviewed scenarios for pairing and progression, without presenting them as a production Swiss algorithm.

## Related specifications

[Product](../product.md), [vocabulary](../taxonomy.md#application-vocabulary), [identity](../identity/authentication-and-access.md), [registration](registration.md), [administration](administration.md), [results](results.md), [privacy](consent-and-privacy.md), [Monomachia](events/monomachia-2027.md#conduction-rules).
