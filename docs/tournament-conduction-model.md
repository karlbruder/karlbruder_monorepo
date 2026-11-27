# Tournament conduction model

**Created**: 2026-11-27
**Last updated**: 2026-11-27

This is a proposed technical model for implementation planning. Production conduction is not implemented. The governing contracts are [conduction](../specs/tournaments/conduction.md), [Monomachia](../specs/tournaments/events/monomachia-2027.md#conduction-rules), and [results](../specs/tournaments/results.md). The [validation handoff](tournament-conduction-validation.md#modeling-handoff) records the approved source and prototype limits. This document does not depend on the owner's unpublished file or the prototype's in-memory objects.

## Context and ownership

The existing `Tournament` is the event context. `TournamentRegistration` is the source of eligible real participants. Supabase Auth owns account identity. Conduction owns the sporting participant and history within the existing tournament, not another catalog or account system. A participant may be explicitly linked to a registration without merging names or losing results. Source refresh and conflicts follow TC-004/005. Registration and attendance remain separate.

Catalog dates and registration status do not start conduction. Conduction start is an explicit staff transition that binds the validated sporting configuration. Tournament completion and cancellation remain distinct operational states. Global guild admins operate every tournament without event or match grants. Internal-event access and the exclusions in RES-003/004/011 are invariants, not policy options. Registration proofs, contacts, birth dates and safety notes do not become spectator data.

## Source sketch disposition

The candidates below come from the v1.3 sketch as described in [issue #105](https://github.com/karlbruder/karlbruder_monorepo/issues/105). The approved repository contracts take precedence.

| Candidate | Disposition | Reason |
| --- | --- | --- |
| Ruleset versions and identified strategies with parameters | Adapt | Bind a validated complete sporting configuration to an existing tournament. A version is identifiable and frozen for a started event, not user-authored executable rules. |
| Participants, phases, phase entries, rounds, matches and bounds | Keep | They represent the TC competition hierarchy. Entries refer to the same tournament participant across phases. |
| Warnings, penalty adjustments and byes | Adapt | Preserve sporting occurrences and derived sanctions. A bye is an allocation, not a fictional match. |
| Tie-breaks and ranking resolutions | Keep | They capture explicit sporting decisions and pending exceptions without inventing winners. |
| Sporting change history and official-result snapshots | Adapt | Preserve earlier official and published outcomes and support explicit downstream reconciliation. Corrections remain possible under the bound policy. |
| Match-to-ruleset references and recalculable projections | Adapt | Each match and result must resolve to the tournament's bound version. Later modeling specifies reference and projection mechanics. Recalculation cannot silently replace an official result. |
| Idempotent participant import and version-checked mutations | Keep | Source identity, retries and stale edits have observable guarantees under TC-005/022. |
| Numbered Arenas | Add | TC-008–010 require configured numbered areas and cyclic queues. |
| Standalone tournament and event/match-specific grants | Reject | The existing catalog owns the event and global admins already have access under TC-001/002. |
| Older sporting alternatives in the sketch | Reject when inconsistent | MONO-006–022 and subsequent clarifications are authoritative for the reference policy. |

## Binding and lifecycle

Each tournament has its own draft configuration. Staff select only registered strategy identifiers and supply parameters accepted by the corresponding validators. Validation covers each row below, cross-references between phases and the completeness of the selected policy. Unknown identifiers, extra or malformed parameters, contradictory settings and incomplete configurations cannot be started. An implementation must validate on the backend. The identifiers below name proposed supported strategies, not a general rules language.

Before start, an authorized admin can replace or edit the draft and validate it again. At explicit conduction start, the backend validates and atomically binds the complete version to that tournament. The start and any competing edit must not both succeed against the same prior state. Once started, any sporting configuration update is rejected, even if it purports to apply only to a future match. A match, result and later correction resolve to that same version. Creating a new version or changing another tournament cannot change the bound event or reinterpret its history. Rejection of an edit leaves the existing binding intact.

The lock covers sporting policy, including configured phase formats, round counts and advancement. It does not freeze the competition's operational state. Staff may prepare entries, check in, allocate Arenas, create and publish permitted later rounds, run tie-breaks and correct records under the bound policy. A changed result retains the earlier result and triggers review of dependent decisions under TC-019/020. Actual transition, history and concurrency contracts are specified in the subsequent modeling checkpoint.

## Policy matrix

The scope column identifies where a value is selected inside one version. Tournament-wide values apply across its phases unless a row explicitly allows a phase or match-kind override. Overrides are part of the version and are validated before start. All numbers are exact values. The Monomachia column is the reference, not a default for other tournaments. The strategies are a bounded proposal for the policies used in this document, not a claim that every possible format is supported.

| Dimension and scope | Strategy, parameters and validation | Monomachia reference and source |
| --- | --- | --- |
| Bound outcomes, tournament | `outcome_table`: unique outcome IDs, nonnegative integer points, `side` of `one` or `none`, and valid-bound flag. A positive score requires one side. A no-side outcome has zero points. Warnings for either side are independent. Require at least one scoring and one non-scoring outcome. | Membros 1, Alvo 3 and Controle 3 require one side and count. Sem Pontuação 0 counts with no side. Inconclusivo 0 does not count and has no side. MONO-007. |
| Regular endings, phase | `time_or_valid_bounds`: positive integer running seconds and positive integer valid-bound limit. End at the first reached. Recording does not pause. Reject a confirmed correction that exceeds the limit. | 180 seconds or seven valid bounds. Stop for review, then explicit confirmation. MONO-008, TC-017. |
| Ordinary outcome, match kind | `net_score`: compare exact net scores, allow negative scores and retain equality as a draw. Validate that scoring and deductions resolve to a numeric score. | Higher net score wins. Equal is draw. Cancellation creates no outcome. MONO-009. |
| Discipline and carry-over, tournament | `paired_warnings_cards`: positive warning-to-yellow and yellow-to-red thresholds, nonnegative yellow score and red phase-ranking deductions, positive expulsion red threshold. Warning groups reset per match. Cards carry tournament-wide. Deductions apply where issued and are not charged again. | Two verbals in one match make a yellow. Two yellows across the tournament make a red. Yellow subtracts 1 from that match score, red gives disciplinary WO and subtracts 1 from that phase ranking. Second red expels. MONO-010–012. |
| Ranking credit, phase | `win_margin`: exact nonnegative base win and draw credits, positive exact margin divisor, defeat credit and independent bye/WO credits. Compute without rounding or a zero floor. Validate divisor nonzero and credits nonnegative. Sanction deduction is separate. | Win `1 + net margin / 10.5`, draw `0.5`, defeat `0`. Bye and ordinary WO winner each get `1`, affected athlete `0`. Red adds phase deduction. MONO-013/015. |
| Standing criteria, phase | `ordered_criteria`: nonempty list of distinct supported IDs from `ranking_points`, `first_bloods`, `three_point_bounds`, `sporting_tie`, `verified_age`. Require ranking points first and the sporting tie before age when both appear. Only configured criteria break equality. First blood is the first confirmed scoring attack, not a deduction. The 3-point metric counts individual outcomes worth 3 points. | Ranking points, first blood, 3-point bound count, sporting tie, then age. Use exact values. Three Membros do not make one 3-point bound. Retain valid attacks before WO. MONO-014/018. |
| Pairing, qualification phase | `swiss_min_repeats`: positive round count, recorded initial order, official preceding round required, ranking-based ordering, minimum repeat pairs before total points difference, deterministic initial-order tie resolution. Odd field uses fewest byes then lower position while preserving viable pairs. Repeat requires staff approval. | Seven Swiss rounds. Initial order or recorded draw for round one. Later ordering uses points, first bloods and 3-point bounds. MONO-016. |
| Advancement and final, phase | `top_eligible`: positive qualifier count no larger than eligible phase entries at confirmation. `round_robin_once`: distinct entries, each pair once, with a valid round schedule. Completion waits for required ties. Phase-local ranking statistics reset. | Four eligible qualifiers after round seven and ties. Final A–D plays A–D/B–C, A–C/D–B, then A–B/C–D. Top three eligible reach the podium. Cards carry, prior deductions do not recur. MONO-006/017/021. |
| Sporting tie, phase | `duel_or_minigroup`: two tied athletes use one duel. Three or more use one round-robin minigroup, ordered by duel wins then verified age. A duel uses `first_scoring_attack`, with configured scoring outcome IDs and no regular time or bound limits. Require the IDs to exist and score positively. | Any first Membros, Alvo or Controle attack wins, regardless of value or net score. Duel statistics do not credit regular standings. Verbals reset, cards carry and red sanctions still apply. MONO-018/019. |
| Exceptional outcomes, tournament and match kind | `explicit_wo_pending_exception`: explicit staff decision for ordinary WO, no fictional score. Simultaneous red or inability of both to continue stays pending. Age requires verified full dates. Missing or equal dates do not select a winner. Cancellation has no automatic credit. | Ordinary WO credits the opponent independently of partial score. A red ends the match by WO. Simultaneous reds, both unable to continue and missing or equal age evidence remain pending where applicable. MONO-009/012/015/022. |

Within the tie strategy, a change in ranking caused by a duel sanction requires review of the original tied group. Tie-breaks are additional to regular rounds and do not themselves award regular match credits, first blood or 3-point-bound statistics. An unresolved exception blocks dependent advancement or publication. A verified age decision may be disclosed without the date under RES-011.

An expelled athlete remains in the history but is excluded from new pairings, byes, qualification and podium. Their already published future matches become opponent WOs. Prior deductions are not repeated. A correction that reverses the sanction requires review of those later effects. Corrections and voids recompute scores, valid bounds, first blood, warning promotions and affected card progression. A void removes its warnings. An inconclusive occurrence can retain them. MONO-012/020 and TC-020 govern these effects.

## Two isolated fictional configurations

The following are fictional parameter sets for the strategies above, not new event rules. Both use the reference outcome table, discipline, ranking, Swiss pairing, advancement and exceptional-outcome policies. Each has its own configuration version and tournament binding. Both use the same first-scoring-attack duel and verified-age fallback. They differ in these fields:

| Field | Championship Cedar | Championship Birch |
| --- | --- | --- |
| Regular ending | `time_or_valid_bounds(180 seconds, 7 bounds)` | `time_or_valid_bounds(120 seconds, 5 bounds)` |
| Ordered standing criteria | points, first bloods, 3-point bounds, sporting tie, verified age | points, 3-point bounds, first bloods, sporting tie, verified age |

For equal ranking points, suppose Ada has two first bloods and one 3-point bound while Bea has one first blood and two 3-point bounds. Cedar orders Ada first. Birch orders Bea first. In another regular match at 130 seconds with six confirmed valid bounds and no earlier exceptional ending, Birch must already have stopped at its fifth bound or 120-second limit. Cedar has not yet reached either regular limit. These results follow selected values, not championship names. A concrete operation cannot accept Birch's sixth bound after review has begun. Detailed calculation and correction examples belong to the next modeling checkpoints.

Before either start, staff can edit and revalidate its draft. Once Cedar starts with its selected version, changing Birch or creating a later version leaves Cedar's configuration and historical results unchanged. A request to change Cedar's future match limit is rejected. Creating its next permitted round and correcting an existing record remain available under the frozen policy.
