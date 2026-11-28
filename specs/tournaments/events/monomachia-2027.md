# Monomachia Karlbrüder 2027

**Created**: 2026-10-17
**Last updated**: 2026-11-27

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | First major event using the generic tournament platform |
| Applications | landing for public presentation; frontend and backend for tournament workflows |
| Sources | Product-owner overview and Monomachia source notes, [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20), [#21](https://github.com/karlbruder/karlbruder_monorepo/issues/21), [#24](https://github.com/karlbruder/karlbruder_monorepo/issues/24), and the [conduction decisions adopted on 19 November 2026](../../../docs/tournament-conduction-validation.md) for [#91](https://github.com/karlbruder/karlbruder_monorepo/issues/91) |

## Event facts from the source

| Fact | Value or status |
| --- | --- |
| Name | Monomachia Karlbrüder 2027 |
| Event date | Saturday and Sunday, 16–17 January 2027; daily times and schedule remain unconfirmed |
| Discipline | Longsword (`longsword` in the initial tournament model) |
| Internal event | `false` in issue #20's initial setup example |
| Instagram | [monomachia.karlbruder](https://www.instagram.com/monomachia.karlbruder) |
| Public presentation | Existing `/monomachia` page in `landing/` |
| Registration | Authenticated application flow under the latest product direction |
| Application entry | `app.karlbruder.com/tournaments/registration` from `karlbruder.com` or event links |
| Registration date convention | Opening day through closing day, inclusive, UTC−03:00 |
| Seat assignment | Staff confirmation occupies a seat, during payment approval or later selection from the waitlist; registration/proof review does not |

## Rules

- **MONO-001:** Public presentation uses Monomachia visual identity and keeps event information and the application entry point readable on phone and desktop.
- **MONO-002:** The event uses shared tournament registration, payment review, capacity, privacy, communications, and results capabilities. Its configuration and branding must not create a second backend.
- **MONO-003:** Event facts include fee, registration deadline, capacity, regulation, mandatory equipment, cancellation/refund policy, location/schedule, and prizes/categories once confirmed. Unknown facts remain unconfirmed rather than receiving invented defaults.
- **MONO-004:** Beginner/special-category eligibility is confirmed by guild staff (admins) against the final regulation. A participant's self-selection is not sufficient.
- **MONO-005:** Required declarations and versioned regulation acceptance follow the shared consent specification. The versioned rules set out official live coverage and named results. Before registration opens, publish the applicable coverage channels and youth participation terms.

## Tournament configuration

Event values are staff-managed Tournament configuration, not product questions. Use the generic resource supplied by the owner:

| Configuration | Tournament fields or policy |
| --- | --- |
| Identity and description | `id`, `name`, `description`, `discipline`, `is_internal` |
| Event dates | `starts_at`, `ends_at` |
| Registration window | `registration_opens_on`, `registration_closes_on`. Inclusive UTC−03:00 calendar days |
| Payment deadline and prices | `payment_due_at` and tournament registration products with prices in BRL |
| Capacity | `competitor_capacity`. Null means unlimited. No waitlist-size limit |
| Venue and schedule | `location`, `schedule` |
| Regulation | Publish a versioned rules document in tournament settings. Retain the version recorded at acceptance. |
| Equipment and cancellation | `equipment_requirements` and a versioned cancellation policy document. Monomachia is non-refundable and uses `refunds_allowed = false`. |
| Record creation | `created_at` |
| Pix destination | Receiving account and Pix key are payment configuration, not fixed product-spec values |

Registration prices are listed below. Pix destination, registration dates, capacity, venue, schedule, and final regulation remain unconfirmed. Populate these values for event rollout. Do not block generic platform design on them. Eligibility, minimum age, and any prizes/category criteria belong in the configured event regulation rather than hardcoded Monomachia logic. This does not introduce automated category eligibility beyond the shared staff-review rules.

The minimum age for Monomachia participation is 14 years. Publish this requirement with the event conditions. The applicable age assessment date and enforcement mechanism are not specified by this decision.

The intended registration experience presents the supplementary participation conditions as an attached PDF and obtains acceptance through a registration checkbox. The current additional-document mechanism does not record the attachment's version in registration acceptance evidence. Aligning that mechanism and its wording with this event requirement is future work.

The table lists event configuration, not the full schema. `Tournament.is_registration_closed` and `RegistrationAcceptance` already support staff closure and versioned acceptance evidence. Monomachia omits the athlete cancellation control under [ADR 0011](../../decisions/0011-tournament-refund-eligibility.md).

An athlete may withdraw at any time, including on the event day, by notifying the guild administration in person or at `suporte@karlbruder.com`. Withdrawal does not entitle the athlete to a refund, including when they withdraw from the waitlist. The event policy also states that no refund is due for postponement, cancellation, disqualification, refusal after late payment, or remaining on the waitlist without a seat. An extraordinary refund request may be sent to the guild administration at the same email for review, including after refusal of a late payment or when a waitlisted athlete receives no seat. The administration may grant a refund, but a request does not guarantee one. This review is separate from the application's ordinary refund flow.

## Registration options

Monomachia offers three registration products. The selection is part of the
registration and follows [REG-019](../registration.md#rules). Participation and
capacity rules are the same for all three options.

| Option | Price | Included benefits |
| --- | --- | --- |
| Social Registration | R$ 50 | Participation and a trophy if the athlete wins one. No other winner prizes or sponsor coupons and giveaways. |
| Full Registration | R$ 100 | Participation, winner prizes, and participation in the distribution of sponsor coupons and giveaways. |
| Plus Registration | R$ 200 | All Full Registration benefits, a competitor kit in preparation, gifts and extra amenities such as snacks and drinks during the event. The complete package is not yet defined. |

Social is intended as a lower-cost option that contributes to the event's costs.
The product description identifies the benefits of each option. This specification
does not define a separate perk inventory or fulfillment workflow.

The R$ 100 Passe da Realeza is a separate spectator offering, not an official tournament entry. It includes a gift kit, participation in drawings, access to exclusive areas and non-competitive free bouts on Sunday with mandatory equipment. Spectator admission remains free. The pass does not consume tournament competitor capacity. Its platform offering and capacity handling require implementation and are not implied by the existing athlete registration products.

Mandatory longsword equipment comprises a fencing mask with rear head and neck protection, rigid gorget, HEMA jacket or suitable gambeson, heavy longsword HEMA gloves, rigid elbow and forearm protection, rigid knee and shin protection, rigid groin protection, chest protector, HEMA pants, closed athletic shoes and a steel feder suitable for sporting combat. No skin may be exposed during bouts. Organizers inspect and approve equipment and weapons. Detailed specifications, including weight, flexibility and pre-approved brands, and the full prize details are planned for publication by the end of December 2026.

Official YouTube live coverage is not confirmed. If offered, the intended live audience must sign in, subject to confirmation of the YouTube access mechanism. Registration authorizes the organizer and its authorized photographers and videographers to photograph and record athletes at the event even without live coverage. The disclosed uses include subsequent publication and promotion, replays, highlights, bout analysis and promotion of the next tournament. Photographs, promotional material and highlights may be publicly accessible. Named results may be public. The same legal guardian who signs a minor's term must accompany the athlete at the event. Requests concerning images and results go to `suporte@karlbruder.com` and are assessed under applicable rights and policy.

## Open questions

The full Plus package contents are not yet provided. Shared unresolved policies remain in the [question index](../../open-questions.md). The sporting rules below are adopted for the conduction prototype. They do not replace the final uploaded event regulation, coverage disclosures or youth publication safeguards. External correction notifications and exports remain deferred in their owning specifications.

## Conduction rules

The product owner supplied TournamentConduction v1.3 dated 19 November 2026 and explicitly adopted its functional proposals as well as its confirmed rules. The [validation record](../../../docs/tournament-conduction-validation.md) records that source and the later clarifications about check-in, Arenas and the shared live view. These are event policies built on [shared conduction](../conduction.md), not universal rules for every tournament. Their adoption is not evidence that the prototype or production feature has been implemented.

- **MONO-006:** Qualification uses Swiss pairings for seven regular rounds. The four best eligible participants advance to a single round-robin final. The final has four athletes, six distinct matches over three rounds, and a podium of its top three eligible athletes. Tie-break matches are additional and do not count toward regular round totals.
- **MONO-007:** Each confirmed bound has one scoring side or neither. Ponto Membros gives 1 point, Ponto Alvo gives 3 and Ponto Controle gives 3. Each counts as one valid bound. Sem Pontuação gives 0 and counts as valid. Inconclusivo gives 0 and does not count toward the limit. Scoring types require exactly one scoring side. Sem Pontuação and Inconclusivo require neither. Warnings can independently apply to either athlete, both or neither.
- **MONO-008:** A regular match lasts 180 seconds of running time with explicit manual pause/resume and at most seven valid bounds. Recording does not pause the clock. Time expiry or the seventh valid bound, whichever comes first, stops combat and starts result review. A correction cannot produce an eighth valid bound.
- **MONO-009:** For an ordinary ending, compare net match scores after yellow-card deductions. The higher score wins and equal scores remain a draw. Negative scores are valid. WO decides the winner independently of the partial score. Cancellation alone creates no sporting outcome. Result confirmation remains a separate staff action under TC-017.
- **MONO-010:** Two verbal warnings to the same athlete in the same match generate exactly one yellow card. Consume each pair once. An unconverted verbal warning does not carry to another match or phase. Retain historical records when a match ends or is reopened. A new tie-break match also starts with zero verbals.
- **MONO-011:** Each yellow card deducts 1 from the score of the match in which it is issued. Every pair of yellow cards to an athlete across the tournament generates one red card, even when the yellows were issued in different matches or phases. Use the sporting occurrence order, not the order in which matches were created or displayed. The red belongs to the match that issues the second yellow in that pair. Operating a later-created match first does not silently reinterpret an earlier official result. Corrections follow TC-019/020. Red means a WO defeat and an additional 1-point ranking deduction in the phase of that match. Cards carry across phases, but prior score/ranking deductions are not charged again. Neither score nor ranking has a minimum of zero. Direct card entry without the adopted promotion chain is outside this MVP.
- **MONO-012:** A first red ends that match by disciplinary WO. The second red in the tournament also expels the athlete. Preserve earlier results and discipline history, exclude the athlete from new pairings and byes, and make them ineligible for qualification and podium. Already published future matches become WOs for their opponents without repeating old card deductions. A correction reversing the sanction requires review of those later effects.
- **MONO-013:** A normal victory earns `1 + net winning margin / 10.5` ranking points. A draw earns 0.5 for each athlete and a defeat earns 0. The margin is from that victory alone, with a fixed denominator even for an early ending. Do not subtract losing margins, cap the total at zero, or round values before comparing standings. Add fixed bye/WO credits and phase-local red-card deductions separately. Aggregate score margin is informational, not an extra tie-breaker.
- **MONO-014:** Order standings by exact ranking points, first-blood count, then count of 3-point bounds, followed by the sporting tie-break and finally age under MONO-018. First blood belongs to the first confirmed scoring attack in combat order, even if that athlete later draws or loses. Deductions do not produce first blood. Each Alvo or Controle occurrence counts as one 3-point bound. Three Membros occurrences do not count as one such bound. Corrections recompute both metrics. Valid attacks before a WO retain their statistics. A deduction alone does not erase the sporting occurrence.
- **MONO-015:** A confirmed bye gives exactly 1 ranking point, without bonus, match, fictional victory, first blood or bound statistics. Confirm its credit when closing the round, once. Ordinary WO for absence, accident or inability to continue gives exactly 1 to the opponent and 0 to the affected athlete, without a margin bonus or a fictional 1 × 0 score. Retain the real partial score and staff decision. Red-card WO also deducts 1 from the penalized athlete's phase ranking, yielding a net contribution of −1 for that defeat.
- **MONO-016:** Review each Swiss round before publication. Use the initial order or a recorded draw for round one. For later rounds, wait for the preceding round's official results, then order active participants by ranking points, first bloods and 3-point bounds. Remaining equality uses the initial order for pairing only. Prefer complete non-repeating pairings with the smallest total ranking-point differences. For odd counts, prefer fewer previous byes and then the lower provisional position, while checking that the remaining pairs are viable. Avoid a second bye before everyone has one where possible. If no non-repeating arrangement exists, explain it and require explicit staff approval of repeats, minimizing repeated pairs before point differences. Use the recorded initial order to make equivalent suggestions reproducible. None of this randomizes Arena allocation under TC-009.
- **MONO-017:** Confirm the four eligible qualifiers after round seven and any required cut-line tie-breaks. Use qualification positions to label final entries A, B, C and D. The final starts its own ranking, first-blood count and 3-point-bound count at zero. Cards still carry across the tournament, while a prior phase's ranking deductions are not charged again. Each athlete faces the other three exactly once. Confirm podium only after the six regular matches and required tie-breaks are settled.
- **MONO-018:** Relevant equality after points, first bloods and 3-point bounds requires a sporting tie-break before age. Two tied athletes fight one duel. Three or more use a single round-robin minigroup ordered by duel wins, then oldest first for any remaining equality, including a cycle of wins. Each duel ends at the first valid Membros, Alvo or Controle attack, regardless of point value or a previously negative net score. Sem Pontuação, Inconclusivo and deductions do not win the duel. Do not impose the regular 180-second or seven-bound limits on a scoreless duel. A verified full birth date is required to use age. Missing or equal dates do not justify name, entry order or a random winner.
- **MONO-019:** Tie-break duels order the tied group without adding sporting ranking credits, first bloods or 3-point bounds to the regular phase ranking. Each duel starts with zero verbals and retains existing cards. A red still ends the duel by WO and deducts 1 from the penalized athlete's phase ranking, without adding regular sporting credit to the opponent. Recalculate the ranking and mark the tied group for review if the sanction changes the original tie. Use phase-end tie-breaks when needed for qualification or final placement rather than forcing extra duels after every provisional update.
- **MONO-020:** Correcting or voiding a bound recomputes its score, valid-bound count, first blood and warnings. Voiding removes its associated warning effects. Making it inconclusive retains applicable warnings. Rebuild verbal promotions within that match and affected card progression across the tournament, without duplicate deductions. If correcting the ending bound removes the bound limit while time remains, staff can explicitly return the match to paused with a reason, then separately resume it. Action recorded late must have occurred within fight time.
- **MONO-021:** The four final entries use the three-round schedule below. Pairings remain attached to the confirmed qualifiers and any later correction follows TC-020. Tournament completion and final publication must not conceal an unresolved impact on the final or podium.
- **MONO-022:** Simultaneous red cards or inability of both athletes to continue have no automatic winner defined. Preserve individual sanctions and expose an organizational decision pending. Missing birth dates block an age decision and equal birth dates remain tied. Mark dependent qualification/publication for review without inventing another sporting criterion. The functional fallback is explicit pending review, not an approved automatic exceptional result.

### Regular bound outcomes

| Display result | Scoring side | Points | Consumes one valid bound |
| --- | --- | --- | --- |
| Ponto Membros | A or B | 1 to that side | Yes |
| Ponto Alvo | A or B | 3 to that side | Yes |
| Ponto Controle | A or B | 3 to that side | Yes |
| Sem Pontuação | Neither | 0 | Yes |
| Inconclusivo | Neither | 0 | No |

### Ranking and discipline examples

| Situation | Expected result |
| --- | --- |
| Normal 7 × 4 victory | Winner gets `1 + 3/10.5 = 9/7`. Loser gets 0 |
| Normal 9 × 3 victory | Winner gets `1 + 6/10.5 = 11/7` |
| Regular 5 × 5 draw | Each gets 0.5 |
| Normal 0 × −1 victory without a scoring attack | Winner gets `1 + 1/10.5 = 23/21`. Neither has first blood |
| Bye | 1 ranking point, no match statistics |
| WO after the affected athlete led the partial score | Opponent gets 1 without bonus, affected athlete gets 0 from the result |
| Red-card WO | Opponent gets 1. Penalized athlete gets 0 for defeat and −1 as a ranking sanction |
| One verbal in each of two matches | No yellow card |
| Two verbals in one match | One yellow and −1 in that match |
| Three verbals in one match | One yellow and one unconverted verbal. The remaining verbal does not carry |
| One yellow in each of two matches | Second yellow completes the tournament pair and generates a red in the second match |
| Four yellows across the tournament | Two reds and expulsion, with each sanction applied once at its occurrence |

### Final schedule

| Round | Match 1 | Match 2 |
| --- | --- | --- |
| 1 | A × D | B × C |
| 2 | A × C | D × B |
| 3 | A × B | C × D |

## Acceptance criteria

- **MONO-AC-001:** The public event page presents confirmed event facts and directs registration into the application.
- **MONO-AC-002:** A signed-in user registers for Monomachia through the same domain capabilities used by another configured tournament.
- **MONO-AC-003:** Submission produces a registration number and the correct non-confirmed initial status.
- **MONO-AC-004:** Event-specific eligibility and terms use the final configured versions and preserve acceptance evidence.
- **MONO-AC-005:** Given the qualification phase, when its required results and cut ties are settled, then exactly four eligible athletes advance after seven regular Swiss rounds.
- **MONO-AC-006:** Given each bound result type, when staff confirm it, then the side, points and valid-bound count follow MONO-007. Inconclusive occurrences remain in history and an eighth valid bound is rejected.
- **MONO-AC-007:** Given a regular match, when time reaches 180 seconds or an accepted record or correction creates the seventh valid bound, then combat stops for review without automatically confirming its result. A correction that creates the limit also enters review from paused. Manual pause preserves the remaining time.
- **MONO-AC-008:** Given equal or negative net scores, when confirming an ordinary result, then equality is a draw and the greater score wins without truncating negatives or inventing first blood.
- **MONO-AC-009:** Given one verbal in each of two matches, when discipline is calculated, then no yellow is generated. Two verbals in the same match generate exactly one yellow and one match-score deduction.
- **MONO-AC-010:** Given yellows issued in different matches or phases, when the next pair is completed, then one red causes WO and one phase-local ranking deduction in the match that issues the second yellow. Playing minigroup duels outside their creation order preserves earlier official outcomes and attributes the red to the currently played duel. A second red expels the athlete without recharging prior deductions.
- **MONO-AC-011:** Given a bye, ordinary WO or red-card WO, when standings are confirmed, then credit and sanctions follow MONO-015 independently of partial score, without bonus or fictional bounds.
- **MONO-AC-012:** Given the ranking examples above, when ordering standings, then exact values, first bloods and 3-point-bound occurrences are used without a rounded or aggregate-margin tie-breaker.
- **MONO-AC-013:** Given an odd Swiss field or no possible repeat-free pairing, when reviewing the next round, then the suggested bye and pairing explanation follow MONO-016 and a repeat requires explicit staff approval.
- **MONO-AC-014:** Given four confirmed finalists, when starting the final, then phase-local sporting statistics restart at zero, existing cards remain, and six unique matches are scheduled with three matches per athlete.
- **MONO-AC-015:** Given an unresolved two-person or minigroup tie, when duels are conducted, then the first valid attack wins each duel and minigroup wins precede age. No regular phase credit or sporting statistics are added by those duels.
- **MONO-AC-016:** Given a duel with a negative score or a red-card sanction, when an attack or sanction is accepted, then the valid attack condition or disciplinary WO takes effect and any change to the original ranking tie is flagged for review.
- **MONO-AC-017:** Given a retroactive bound correction, when recalculating discipline, then affected later cards, ranking deductions and expulsion are rebuilt without duplication and later sporting decisions are marked for review.
- **MONO-AC-018:** Given a disqualified athlete, when creating new pairings/byes or confirming qualifiers/podium, then they are ineligible. Their published future matches become opponent WOs while earlier history is retained.
- **MONO-AC-019:** Given simultaneous exceptional endings, absent age evidence or equal birth dates, when determining advancement, then the unresolved decision is explicit and no arbitrary winner is produced. Full birth dates are never exposed in spectator views.

## Source conflicts and baseline

Issue #21 originally placed the form in `landing/`. [Decision 0001](../../decisions/0001-public-website-and-application.md) supersedes that placement. Issue #24's visual direction remains relevant, but its form-submission references must follow the application boundary.

The broader source requirements include more administration, exports, communications, and privacy work than #20/#21. Their presence here does not mean those features are implemented. The inspected landing page is a presentation and Instagram entry point.

## Related specifications

[Catalog](../catalog.md), [registration](../registration.md), [payments](../payments-and-confirmation.md), [capacity](../capacity-and-waitlist.md), [administration](../administration.md), [conduction](../conduction.md), [results](../results.md), [privacy](../consent-and-privacy.md), [communications](../communications.md).
