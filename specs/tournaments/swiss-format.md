# Swiss rounds and round-robin final

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Later tournament capability, after tournament models and registration are available; not required for the first registration/proof-review release |
| Applications | frontend, backend |
| Sources | Product-owner format proposal, final-points clarification, and scoring/tie-break confirmation on 25 October 2026; FIDE references below |

## Goal

Generate tournament match pairings from the event's participants, give fighters at least five Swiss rounds, and determine the champion through a four-fighter round-robin final.

## Scope and boundaries

This is the initial proposed format for tournaments using this capability, not a mandatory format for every Karlbrüder event. Registration owns participant signup and confirmation. This capability owns round generation, match outcomes, stage standings, and qualification; [results](results.md) owns consultation and publication. Guild staff (admins) manage the competition across tournaments, with backend enforcement and existing internal-event and private-data restrictions.

## Rules

- **SWI-001:** Generate pairings from the selected tournament's participant roster. Participants, matches, and standings remain scoped to that tournament. The roster selection policy remains open under SWI-Q2; signup alone does not establish competition eligibility.
- **SWI-002:** The first stage uses Swiss pairings and has at least five rounds. Declare the round count before the competition starts. Fighters remain in this stage regardless of losses; the intent is for everyone to fight throughout it, subject to the unresolved exceptional cases in SWI-Q4.
- **SWI-003:** Use chess Swiss principles: generally pair fighters with equal accumulated stage points, and do not repeat opponents within the Swiss stage. Generate later rounds from previous outcomes rather than independently shuffling every round. The pairing variant and initial seeding remain open under SWI-Q3.
- **SWI-004:** Following the chess Swiss baseline, an odd roster receives a pairing-allocated bye worth a win, with no second such bye for someone who already received one or equivalent full points without fighting. A bye is not an actual fight; its interaction with the five-fight intent is unresolved under SWI-Q4. Chess piece-colour rules do not define fencing rules.
- **SWI-005:** After the Swiss stage, sum each fighter's stage points and rank the roster. The best four qualify for the final, resolving qualification ties through SWI-010.
- **SWI-006:** The four finalists fight a single round-robin: each fights the other three once, producing six final-stage matches and three fights per finalist. A final-stage match is a new encounter even if those fighters met in the Swiss stage.
- **SWI-007:** Final standings use only points earned in the final-stage matches. Swiss points and Swiss tie-break values do not carry over. Rank finalists by final-stage points, apply the final-stage tie-break policy when needed, and name the highest-ranked finalist champion.
- **SWI-008:** Guild staff generate pairings and record outcomes. Non-admin users cannot change pairings, scores, qualification, or the champion. Results visibility follows RES-004.
- **SWI-009:** Both stages award 1 standings point for a win, ½ for a draw, and 0 for a loss. Standings points are distinct from fencing-action scores; the event regulation determines the bout outcome.
- **SWI-010:** Resolve Swiss-stage points ties in order: Buchholz, Sonneborn–Berger, then drawing lots. Apply each successive method only to fighters still tied. This order also decides ties at the fourth-place qualification boundary.
- **SWI-011:** Resolve final-stage points ties in order: direct encounter, Sonneborn–Berger, then drawing lots. Apply each successive method only to fighters still tied, using the referenced FIDE definitions and only final-stage data. This order determines the champion when final-stage points are tied.

## Chess rules reference and confirmed policy

The [FIDE basic Swiss rules, effective 1 February 2026](https://handbook.fide.com/chapter/C0401202507), provide the pairing and bye baseline. The [FIDE tie-break regulations, effective 1 March 2026](https://handbook.fide.com/chapter/TieBreakRegulations032026), require an ordered tie-break policy for the event; there is no single universal Swiss tie-break sequence. Buchholz is unsuitable for the round-robin final. Apply final tie-break calculations only to final-stage encounters and scores.

The product owner confirmed the scoring and separate stage tie-break orders in SWI-009–SWI-011, resolving SWI-Q1. Drawing lots is the terminal fallback in both stages. Swiss-stage data must never resolve a final-stage tie.

## Acceptance criteria

- **SWI-AC-001:** Pairing generation uses only the selected tournament's competition roster and never includes another event's participants.
- **SWI-AC-002:** A configured Swiss stage has at least five rounds; losses do not eliminate fighters. Later pairings account for accumulated points and do not repeat Swiss opponents. Byes are distinguishable from fought matches.
- **SWI-AC-003:** Once Swiss outcomes and qualification tie-breaks are resolved, exactly the top four advance.
- **SWI-AC-004:** A complete four-fighter final contains exactly six distinct pairings, with each finalist fighting each other finalist once.
- **SWI-AC-005:** Final standings and champion calculation use only final-stage outcomes. Altering Swiss points without changing the qualified fighters or final outcomes does not change the final standings.
- **SWI-AC-006:** Non-admin pairing or outcome changes are rejected by the backend, and internal-event competition data retains member-only visibility.
- **SWI-AC-007:** In either stage, a win adds 1 standings point, a draw adds ½, and a loss adds 0. Each stage's total sums only that stage's points.
- **SWI-AC-008:** A Swiss points tie, including at fourth place, uses Buchholz first, Sonneborn–Berger for remaining ties, and drawing lots only if still tied.
- **SWI-AC-009:** A final points tie, including for champion, uses direct encounter first, Sonneborn–Berger for remaining ties, and drawing lots only if still tied. Swiss-stage outcomes and tie-break values do not affect this calculation.

These are intended outcomes for later implementation, not evidence of delivered behavior. Cases depending on the decisions below require additional criteria when resolved.

## Open questions

None for the first registration/proof-review release. This capability follows that release.

## Deferred questions

- **SWI-Q2:** Which registered participants enter the competition roster: confirmed registrations automatically, or a staff-selected/check-in roster? When is the roster fixed, and how are later changes handled?
- **SWI-Q3:** Which chess Swiss pairing variant and initial seeding should be used, including treatment of fighters without ratings? No fencing rating source or initial random draw has yet been selected.
- **SWI-Q4:** Does the minimum mean five scheduled Swiss rounds or five actual fights per fighter when byes occur? How should small rosters, impossible non-repeat pairings, withdrawals, absences, disqualifications, and fewer than four available finalists be handled?

## Related specifications

[Product](../product.md), [catalog](catalog.md), [registration](registration.md), [administration](administration.md), [results](results.md), [consent and privacy](consent-and-privacy.md).
