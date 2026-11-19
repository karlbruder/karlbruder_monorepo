# Tournament conduction prototype

**Created**: 2026-11-19
**Last updated**: 2026-11-19

[Open preparation](index.html#COND-WF-01/preparation) or [operate a match](index.html#COND-WF-05/combat).

This offline artifact demonstrates preparation, presence, Arena calls, bounds, discipline, official standings, seven qualification rounds, tie-breaks, four qualifiers, six final matches and final publication. All people, decisions and results are fictional. It changes no application or production service.

## Open and navigate

Keep the artifact in its repository location so local fonts, logo and specification links resolve. Open `index.html` directly, or serve the repository from a terminal with an installed Python runtime:

```sh
python -m http.server 8766 --bind 127.0.0.1
```

Open [the local preview](http://127.0.0.1:8766/specs/design/tournament-conduction/index.html#COND-WF-05/combat). This optional review port does not change application ports. A sandboxed server may not be reachable from the desktop browser. Start the preview from an approved host terminal if needed. Do not change firewall rules. The integrated browser requires HTTP instead of file access.

**Tela** selects nine screen groups. **Cenário** replaces the current event's fictional story. **Reiniciar cenário** clears that story's edits. **Visão simulada** switches between admin, visitor/spectator and member/player. It demonstrates visibility, not real authentication. **Notas da spec** maps each screen to its owning rules and acceptance criteria.

Navigation and audience switching retain the same event and match. Fictional state survives reload in the same tab through optional `sessionStorage`. A running clock retains its original time anchor. Closing the browser session can remove edits. Reset starts the selected story again. Theme preference uses a separate local key. No multi-tab, multi-device or cross-domain synchronization is claimed.

Use **Luta em foco** to select a match and **Fase consultada** for qualification/final rankings and tie-break review. On narrow screens use **Menu de condução**. Dense tables have labeled inner scrollers.

## Review walkthrough

1. Inspect preparation, configure numbered Arenas with optional names, and add fictional people before preparing pairs. Homonyms remain distinct people. Check-in only marks presence.
2. Prepare the first round. Review pairs and any bye, distribute to Arenas, then publish. Eight matches in three Arenas follow 1,2,3,1,2,3,1,2. Call athletes and choose **Operar luta**. Unmarked presence does not declare WO.
3. Alternatively start **Luta interativa** on **Luta e bounds**. Start combat, choose the bound result, scoring side and independent warning. Save a draft, then send it. Only accepted bounds change the shared provisional scoreboard. Recording does not pause time.
4. Pause and switch to visitor/spectator. Check the same athletes, Arena, score and accepted bounds without drafts, editor forms, private reasons or audit. Return to admin and reload. The paused score and clock remain. Resume separately.
5. Record multiple bounds, or expand **Controle de tempo da demonstração** and simulate time expiry. Seven valid bounds also end regular combat. Sem Pontuação consumes a bound, Inconclusivo does not. Resolve or void drafts before confirming. **Confirmar resultado oficial** updates official classification once. Final publication remains separate.
6. On **Avanço e final**, complete the other matches using the prepared review fixture. Review the next prepared round and repeat through seven. Fixtures demonstrate progression and continuous Arena allocation without claiming Swiss optimization. Prepare and operate relevant tie-break duels, then apply their order. **Empate no corte** provides a shorter path.
7. Confirm four qualifiers. Final points and attack statistics start at zero while cards remain. Review A–D/B–C, A–C/D–B and A–B/C–D. Complete each current round and move to the next. Publish after three official rounds, required tie-breaks and dependency reviews. Check the three-place podium. **Classificados e final** starts here with prepared qualification results and resolved qualification duels.
8. Open **Correção após publicação**, then **Correções**. Enter a private reason, reopen the official match and correct or void a bound. Review recalculated score, first blood and cards. Confirm the corrected match. Review existing qualification duels through **Fase consultada** if needed. Reconcile dependencies explicitly. This review revalidates previously closed rounds whose results are all official. Final pairs remain preserved. Changed qualifiers leave an organizational decision pending instead of automatic replacements.
9. Compare public and internal access. In **Evento interno**, visitors receive restricted content. Members/admins can consult sporting information. Presence, full birth dates and audit stay outside consultation. Existing youth/privacy safeguards still apply to any future real release.

## Screens and scenarios

URLs use `#COND-WF-xx/scenario`. These are review anchors, not production routes. Screen metadata in `scenarios.js` links rules and acceptance criteria.

| Screen | Demonstrated states | Main rules |
| --- | --- | --- |
| [COND-WF-01](index.html#COND-WF-01/preparation) | Event, phases, Arenas, missing configuration | TC-001/002/008/009 |
| [COND-WF-02](index.html#COND-WF-02/minor) | Entry, presence and minor safeguards | TC-004/006/007, PRIV-010 |
| [COND-WF-03](index.html#COND-WF-03/odd) | Pairs, bye, allocation and publication | TC-009/011–013, MONO-016 |
| [COND-WF-04](index.html#COND-WF-04/called) | Arena queues and calls | TC-002/009/010/013 |
| [COND-WF-05](index.html#COND-WF-05/combat) | Clock, bounds, discipline, endings, confirmation | TC-014–017, MONO-007–012 |
| [COND-WF-06](index.html#COND-WF-06/combat) | Exact ranking, first blood, 3-point bounds, credits and sanctions | RES-006, MONO-013–015 |
| [COND-WF-07](index.html#COND-WF-07/cut-tie) | Rounds, duels, qualifiers, final, podium and publication | MONO-006/017–019/021, RES-007 |
| [COND-WF-08](index.html#COND-WF-08/correction) | Reopening, corrections, private history, dependent review | TC-019/020, MONO-020/022, RES-009 |
| [COND-WF-09](index.html#COND-WF-09/internal) | Shared consultation, accepted provisional bounds, restricted event | TC-018/021, RES-004/005/008/010, PRIV-006 |

| Starting scenarios | Alternative |
| --- | --- |
| preparation / review / published / called | Preparation through athlete call |
| odd / no-arenas / empty | Separate bye, missing Arenas or empty list |
| minor / conflict / error | Minor verification, invalid self-pair or loading failure |
| [combat](index.html#COND-WF-05/combat) | Interactive match, bounds and confirmation |
| [wo](index.html#COND-WF-05/wo) | WO for A/B or both, retaining partial score and pending double WO |
| [discipline](index.html#COND-WF-05/discipline) | Historical yellow. Two new verbals create a second yellow and red |
| [expulsion](index.html#COND-WF-05/expulsion) | Three historical yellows and one red. Two new verbals produce the second red, expulsion and an opponent WO in an already scheduled future match |
| [save-error](index.html#COND-WF-05/save-error) | First send fails, draft remains, retry accepts |
| [cut-tie](index.html#COND-WF-07/cut-tie) | Two tied athletes at the cut, one duel |
| [minigroup](index.html#COND-WF-07/minigroup) | Three tied athletes, three duels, wins then verified age |
| [equal-age](index.html#COND-WF-07/equal-age) | Cyclic wins and identical dates stay pending |
| [final-ready](index.html#COND-WF-07/final-ready) | Seven rounds, resolved qualification duels and four final entries |
| [correction](index.html#COND-WF-08/correction) | Published final and an earlier match with dependent review |
| [internal](index.html#COND-WF-09/internal) | Member/admin consultation and visitor denial |

For a cyclic minigroup, let A win duel 1, B win duel 2, and A win duel 3. Each athlete has one win. Verified age then orders the tie. Missing/equal dates remain pending, with no name/order/random fallback. Dates are fictional staff-side fixture data and never appear in consultation. Duels have no regular time/seven-bound limit. Their first scoring attack wins regardless of net score. Red-card WO takes precedence. Four verbal warnings to both athletes in a fresh match demonstrate simultaneous reds without an automatic winner.

## Design and verification

The artifact extends rendered WF-18/19/20, the prior Arena screen and WF-14. [Current design contracts](../README.md) govern neutral/steel surfaces, restrained wine/gold, angular controls, functional text and both themes. It reuses the official logo and licensed local Source Sans 3, Grenze Gotisch and Roboto Slab. Schwager is unavailable, so Roboto Slab is a documented display fallback. No assets were downloaded.

```sh
node --check specs/design/tournament-conduction/scenarios.js
node --check specs/design/tournament-conduction/sports-demo.js
node --check specs/design/tournament-conduction/sports-views.js
node --check specs/design/tournament-conduction/prototype.js
node --check specs/design/app-wireframes/wireframes.js
node specs/design/tournament-conduction/verify.cjs
git diff --check
```

The verification script includes `verify-sports.cjs`. Checks cover simulation outcomes and projections, exact ranking, correction effects, discipline across matches, tie resolution, final scheduling and private-data exclusion. Exact units of 1/42 are a simulation convenience, not a production storage prescription. Browser evidence and actual limits are recorded in the [validation record](../../../docs/tournament-conduction-validation.md). Requirements adoption does not substitute for the responsible person's artifact walkthrough.

## Functional sources and limits

[Conduction](../../tournaments/conduction.md), [Monomachia rules](../../tournaments/events/monomachia-2027.md#conduction-rules), [results](../../tournaments/results.md) and [global admin access](../../identity/authentication-and-access.md#authorization-rules) own intended behavior. WF-14 links to this detailed sporting artifact and retains its limited directory reference.

There is no production authorization, server clock, concurrency control, real transport, generic Swiss search, schema, migration or integration contract. Projection checks do not replace backend authorization tests. The full state is fictional and deliberately inspectable in the browser. Never enter real people or private information.

Prepared progression supports the original sixteen active demo participants. Entry after drafting pairs, expulsion-dependent alternative pairings, changed qualifiers after a final starts and exceptional double WO require review/pending states. The demo does not invent replacements. These simulation limits do not establish production business rules. The complete owner walkthrough and modeling handoff remain a separate checkpoint.
