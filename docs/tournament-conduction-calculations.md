# Tournament conduction calculations and corrections

**Created**: 2026-11-27
**Last updated**: 2026-11-27

This technical proposal works through the [policy model](tournament-conduction-model.md) and [persistence and operations contracts](tournament-conduction-persistence.md). The governing rules are [TC-014–026](../specs/tournaments/conduction.md#rules), [MONO-006–022](../specs/tournaments/events/monomachia-2027.md#conduction-rules) and [RES-006–012](../specs/tournaments/results.md#confirmed-direction). All athletes, events and times below are fictional. No example is evidence that production conduction exists.

## Inputs and calculation boundary

For a started tournament, resolve the match and its phase through the tournament's bound configuration version. Read accepted bound revisions in their sporting order, accepted clock and exceptional decisions, current participation state and the official source revisions needed for the phase. Drafts, failed requests and voided occurrences do not contribute. A void removes the occurrence's warnings. An accepted inconclusive occurrence can retain warnings. The active revision retains its original match occurrence number and tournament acceptance sequence. A correction never changes the frozen policy.

Evaluate each match's score, valid count, first blood and warnings from its accepted bounds. Apply warning promotions and cards in the chronology below, then evaluate endings and candidate results. For regular matches, a result affects official standings only after staff confirmation. Byes contribute once when confirmed at round completion. Store an official result revision with the exact accepted input revisions, sporting-order and configuration references, calculated outcome and sanctions. Derived standings may be rebuilt from these references. Rebuilding a candidate never overwrites a prior official snapshot or published decision.

Keep ranking values as rational numbers, or as an equivalent exact representation. For Monomachia, `1 + margin / 10.5` is `1 + 2 × margin / 21`. Sum exact per-result values and phase-local penalties before comparing. Decimal formatting is display only. Do not subtract losing margins, clamp a negative score or ranking to zero, or add aggregate score margin as a tie-break. A retry of a result confirmation returns the same accepted revision and must not add another contribution.

## Sporting chronology and cards

Allocate a strictly increasing tournament acceptance sequence inside the serialized transaction for each newly accepted bound or explicit sporting occurrence. Store it alongside the match-local occurrence order. Initially, the sporting order follows that sequence. A correction or void revises the same occurrence and retains both keys. It does not get inserted at its correction timestamp. Match creation, schedule order, wall-clock timestamps and Arena order never decide card attribution. The acceptance sequence is stable across reloads and equal server timestamps. A match that has not yet entered operation cannot have an accepted occurrence.

If staff discover that an occurrence was entered late or in the wrong order, they must identify its actual place through an explicit reasoned correction. Store a versioned sporting-order revision that references the occurrence and its corrected position. Keep the original acceptance sequence and prior order revision for historical snapshots. The backend marks affected subsequent official results and decisions for review. It must not silently rewrite them. Late action is eligible only if it occurred within fight time under TC-019. The correction transaction uses the same tournament lock as normal acceptance. A normal later acceptance cannot reorder an already official occurrence. This distinction permits simultaneous Arenas without assuming that their clocks or creation order establish chronology.

For each athlete and match, walk confirmed warning occurrences in match order. Every pair promotes once to a yellow in the match containing the second warning. Any leftover verbal is local to that match and does not carry. Walk the resulting yellows in tournament sporting order. Every pair promotes once to a red in the match issuing the second yellow. A yellow deducts one from that match's score. A red ends the match by disciplinary WO and deducts one from the ranking of that phase. A second tournament red expels the athlete. Prior deductions are not charged again. A correction rebuilds the candidate chain from the original position and identifies later dependent results that differ. Simultaneous reds do not create an automatic winner.

### Reverse-order duel regression

Three minigroup duels are created in order D1, D2, D3. Athlete Ana appears in D3 and D1. There are no earlier cards. D3 is played first. Two accepted inconclusive bounds each warn Ana, producing her first yellow. Ana then scores Membros and staff confirm D3 as an official Ana win. Store its result revision R1 and source sequences. After reload, D1 is played. Two inconclusive bounds each warn Ana. The second warning produces her second tournament yellow and first red **in D1**, so D1 stops for review as a disciplinary WO against Ana. After confirmation, the affected phase gets a `−1` adjustment for Ana. The opponent gets no regular-phase credit from a tie-break duel. A changed original ranking tie is marked for review under MONO-019.

D3 remains the same official Ana win, with its first yellow and no red. This holds when the duel start timestamps are equal or different because acceptance sequence, not D1/D3 creation order or timestamp, establishes chronology. Preserve the assigned Arenas and queue positions. If staff reopen D3 with a reason and correct its first warning to none, the first yellow disappears. Recompute D1 as one yellow and no red, and mark D1 and the tie group for review. Do not silently replace D1's official result or resume combat. Staff confirm a consistent corrected outcome and explicitly reconcile the affected decisions. This reproduces the regression recorded in the [validation handoff](tournament-conduction-validation.md#modeling-handoff).

## Regular match and exact standings

Under the Monomachia outcome table, consider this accepted regular match. There are no warnings or earlier exceptional endings. All occurrences happen before 180 running seconds.

| Order | Accepted outcome | Score A–B | Valid count | First blood |
| --- | --- | --- | --- | --- |
| 1 | A Alvo | 3–0 | 1 | A |
| 2 | B Alvo | 3–3 | 2 | A |
| 3 | A Controle | 6–3 | 3 | A |
| 4 | B Membros | 6–4 | 4 | A |
| 5 | A Membros | 7–4 | 5 | A |
| 6 | Sem Pontuação | 7–4 | 6 | A |
| 7 | Sem Pontuação | 7–4 | 7 | A |

At bound 7, stop the clock and enter review. No eighth valid bound is accepted. Staff settle drafts and explicitly confirm. A wins by 3 and earns `1 + 3/10.5 = 9/7`. B earns `0`. A has one first blood and two 3-point bounds. B has one 3-point bound. The result revision captures the exact input and version. Neither the running 7–4 score nor the review state had awarded official ranking points before confirmation.

An ordinary 5–5 result gives each athlete `1/2`. A confirmed bye gives `1` without a match, win, first blood or bound statistics. In a separate ordinary WO, if A leads 4–1 and cannot continue, preserve 4–1 as the real partial score. B receives exactly `1`, A receives `0`, and no fictional 1–0 score or margin bonus is invented. Accepted attacks before the WO retain their statistics. A red-card WO instead also applies `−1` to the penalized athlete's phase ranking. A score of `0` versus `−1` without any scoring attack produces a normal winner's `23/21`, with no first blood.

Suppose a phase has official contributions `9/7`, `1/2` and one bye for A, and `11/7` and `1` for B. A totals `39/14` and B totals `18/7` or `36/14`. A ranks above B even if rounded display values are similar. For equal exact points, compare first-blood count, then the number of individual Alvo or Controle bounds, then the sporting tie and age as required. A Membros attack contributes to first blood when first, but three such attacks do not create a 3-point-bound count.

## Two configurations, different outcomes

Use the two independent configurations from the [policy model](tournament-conduction-model.md#two-isolated-fictional-configurations). Cedar has `180` seconds and `7` valid bounds. Birch has `120` seconds and `5`. Both use the same scoring, ranking and discipline strategies. The following event sequence is offered independently to each match, with no warnings and all listed actions before 120 seconds.

| Bound | Action | Cedar | Birch |
| --- | --- | --- | --- |
| 1–5 | A Alvo, B Alvo, A Controle, B Membros, A Membros | 7–4, five valid bounds. Continue. | 7–4, five valid bounds. Stop for review. |
| 6–7 | B Alvo, B Controle | 7–10, seven valid bounds. Stop for review. | Not accepted after its ending. |

After separate confirmation, Cedar's B wins `9/7` and Birch's A wins `9/7`. Each result references its own tournament and bound version. Birch's rejected later submissions cannot change its result. A subsequent draft version for another event cannot change either frozen version. No calculation branches on a championship name.

For a separate tied standings comparison in each event, assume equal exact points. Ana has two first bloods and one 3-point bound. Bea has one first blood and two 3-point bounds. Cedar compares first blood first and places Ana above Bea. Birch compares 3-point bounds first and places Bea above Ana. Each uses its own configured ordered criteria. These comparisons do not need a sporting duel because an earlier configured criterion resolves them.

## Swiss pairing and progression

The `swiss_min_repeats` strategy takes the previous round's official standings and recorded initial order. Rank active eligible entries by exact ranking points, then the configured pairing metrics. Use initial order only to resolve a remaining pairing equality. For odd fields, try bye candidates in ascending prior bye count, then from lower provisional position. Test whether the remaining entries can form viable pairs. Prefer complete non-repeating pairings. Among them minimize the sum of absolute exact ranking-point differences. Resolve equivalent suggestions using recorded initial order. If no complete repeat-free arrangement exists, minimize the number of repeated pairs first and the total difference second. Explain the repeat and require staff approval before publication. TC-009 Arena allocation occurs afterward and does not choose opponents.

For a five-person example, initial order and current standings are A, B, C, D, E with exact points `4, 3, 2, 1, 0`. E has already had one bye. Everyone else has none. D is the lowest-ranked eligible athlete without a bye, so propose D's bye if the remaining pairs are viable. Suppose A has already faced B, and all other pairings among A, B, C, E are new. `A–B / C–E` repeats A–B. `A–C / B–E` and `A–E / B–C` are repeat-free and each has total difference `5`. The recorded initial-order comparison selects `A–C / B–E`. Staff review and publish. Confirm D's one-point bye only when the round closes.

For four athletes A–D on `4, 3, 2, 1` who have each already faced all three others, every complete pairing repeats twice. `A–B / C–D` minimizes total difference at `2`. Explain that repeats are unavoidable and require explicit staff approval. Do not silently generate a rematch or use Arena position as a pairing criterion.

After seven completed Monomachia Swiss rounds, resolve any relevant tie at the four-person cut. Confirm the four eligible qualifiers in order as A, B, C, D. The final starts fresh phase-local points, first bloods and 3-point-bound counts at zero. Cards remain tournament-wide. Previous phase ranking deductions are not repeated. Schedule `A–D / B–C`, `A–C / D–B`, then `A–B / C–D`. Each finalist fights three distinct opponents. Only after six official regular matches and required ties are settled can staff confirm the eligible podium and separately publish final results.

## Sporting ties and unresolved cases

For two participants tied after the preceding configured criteria, a duel ends at the first accepted Membros, Alvo or Controle attack. A scoreless or inconclusive bound does not win, and the regular time and valid-bound limits do not end this duel. Even if yellow deductions have made the attacking athlete's net score negative, the first accepted scoring attack wins unless an applicable exceptional ending takes precedence. Duel results add no regular phase points, first bloods or 3-point-bound statistics. Each duel starts with no carried verbals, while existing yellows and reds carry. A red produces the phase-local penalty and may require reviewing the original tie.

For three tied athletes P, Q and R, suppose P beats Q, Q beats R and R beats P. Each has one duel win. Verified age orders the remaining equality, oldest first. If the relevant full birth date is missing, or verified dates are equal, keep the unresolved position pending. Display a permitted age-based explanation without disclosing birth dates. Simultaneous reds or both athletes unable to continue also remain pending, with individual sanctions preserved. No name, initial order, random draw or fabricated score supplies a winner under MONO-022.

## Correction, clock and republication

Suppose a regular match has six accepted valid bounds and one accepted inconclusive occurrence. There is time left, with the clock either running or paused. Staff correct the inconclusive occurrence to Sem Pontuação with a reason. The accepted revision remains in its original sporting position, making seven valid bounds. In the same transaction, stop the clock and move to result review from either prior state. No further time runs and no official credit is awarded until staff explicitly confirm a consistent result. If correction instead changes an accepted Membros from A to Alvo for B and no ending results, recompute the score and first blood while preserving the running or paused state. A running clock continues. A paused clock stays paused. Confirmation without an ending is rejected.

The same ending rule applies when a correction creates a red or the first valid scoring attack in a tie-break duel. For the red case, an athlete already has three accepted verbal warnings in the current match and no prior yellow. Correct a fourth inconclusive occurrence to add a warning for that athlete. The four warnings create two yellows and a red. The match stops for disciplinary review from running or paused. For the duel case, correct an accepted inconclusive occurrence to A's Membros attack. That first scoring attack stops the duel for review from running or paused. Neither case is official before confirmation. If both athletes simultaneously reach red, keep the winner pending.

If a correction removes a seventh valid ending and time remains, keep review until a reasoned explicit return to paused. A separate resume action is required. An accepted correction cannot create an eighth valid bound. A void removes its warning effects. Changing the occurrence to inconclusive does not automatically remove them.

For a published qualification result, retain official result R1 and publication P1 when staff reopen with a reason. Mark P1 and each affected later pairing, tie, qualifier, final entry or podium decision under review. Rebuild score, standings and card progression under the same bound version, and retain the old result and decision references. Staff confirm the corrected result as R2. Affected started or published matches stay intact. Staff explicitly reconcile every impact, including whether a changed qualifier requires an organizational decision. Only when required reviews are settled may staff publish P2. P1 remains identifiable as an earlier publication and must not be shown as current. A duplicated confirmation with the same key returns R2, not R3 or duplicate ranking credit. A stale edit fails and requires a fresh read.

Clock recovery follows the [server-time contract](tournament-conduction-persistence.md#concurrency-time-and-projections). For example, an accepted running anchor at 30 elapsed seconds with a 180-second limit yields 140 seconds remaining ten real seconds later, even after a reload. A paused anchor at 30 elapsed remains at 150 seconds remaining after the same interval. If all viewers disconnect past the deadline, the next authorized read settles review at the deadline and does not restart time. Failed or pending submissions are not shown as accepted during recovery.

## Coverage for implementation

The examples exercise TC-AC-009–016, TC-AC-021/022 and MONO-AC-005–019, with the policy-specific outcomes and correction boundaries stated above. Implementation tests should also cover independent transactions for the two events, equal-time reversed duels, staff-versus-spectator authorization, duplicate and stale requests, publication revisions, and each running/paused correction variant. Full mapping of mandatory flows to implementation issue drafts belongs to the next checkpoint.
