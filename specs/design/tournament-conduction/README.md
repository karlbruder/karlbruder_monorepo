# Tournament conduction prototype

**Created**: 2026-11-19
**Last updated**: 2026-11-19

[Open the navigable prototype](index.html#COND-WF-01/preparation).

This offline HTML/CSS/JavaScript artifact demonstrates tournament preparation, basic presence marking, reviewed first-round pairings, cyclic Arena allocation and athlete calls. It uses fictional people and local simulated state. It does not change the application or create real tournaments, registrations or accounts.

## Open and navigate

Open `index.html` directly in a browser. Keep the artifact in its repository location so its fonts, logo and specification links resolve. Where browser tooling requires HTTP, serve the repository from a local terminal with an installed Python runtime:

```sh
python -m http.server 8766 --bind 127.0.0.1
```

Then open [the local preview](http://127.0.0.1:8766/specs/design/tournament-conduction/index.html#COND-WF-01/preparation). This is an optional review server, not a change to application development ports. A server started in an isolated sandbox may not be reachable by the desktop browser. Start it through the normal approved host terminal in that case. Do not change firewall rules to review the artifact.

Use **Tela** to choose one of four screen groups, or the application's preparation/participant/round/Arena navigation. Use **Cenário** to load a reproducible starting story. Scenario selection deliberately replaces that event's fictional preparation. **Reiniciar cenário** clears the current story's edits. Switching between screens keeps edits and browser back/forward works within that story. Reload starts again from the URL's scenario. **Notas da spec** exposes the screen's owning rules and acceptance references outside the application frame.

The event selector keeps each event's session state separately. **Criar outro torneio** creates an empty fictional event with no Arenas. Presence and preparation in another event remain unchanged. Theme switching preserves input and current event context. The theme preference may persist in the same browser if local preference storage is available. No cross-domain preference synchronization is demonstrated.

## Review walkthrough

1. Open [preparation](index.html#COND-WF-01/preparation). Inspect the event's phases and its three Arenas, including an Arena without a name. Rename the event or add an Arena before allocating matches. The main story starts with sixteen fictional athletes, giving eight first-round matches.
2. Open **Participantes**. Mark a person present and verify the presence count. Presence changes neither registration status nor match outcomes. Add names individually, preview one name per line or generate eight fictional test players before preparing matches. Duplicate names remain distinct people.
3. Open **Rodadas**, select **Preparar primeira rodada** and review the initial-order pairs. Select **Distribuir lutas entre Arenas**. With the original three Arenas and sixteen players, the eight assignments are 1, 2, 3, 1, 2, 3, 1, 2, giving queues of 3, 3 and 2.
4. Select **Publicar rodada revisada**, then **Ver filas das Arenas**. Call the next athletes in each Arena. The call is visible in the queue and its announcement. An unmarked presence does not create a WO. Another call in the same Arena waits for that match's future operation.
5. Compare the alternative scenarios below. Switch to the empty second event or create one and confirm that the first event's preparation is retained.
6. Review at desktop and phone widths. On a phone use **Menu de condução**, follow a section link or press Escape to close it. Dense lists have a labeled inner horizontal scroller. Test keyboard focus, required Arena number, optional name, error messages and both themes.

Match operation, clock/bounds, result confirmation, standings, later Swiss rounds, qualifiers, final and sporting spectator consultation are not interactive in this artifact yet. Their controls are absent or explicitly disabled. A call does not report that combat has started or that a result exists. Round-two preparation is disabled because the preceding results are not yet demonstrated.

## Screen and state references

The URL uses `#COND-WF-xx/scenario`. These are review anchors, not production routes.

| Screen | Review outcome | Rules and acceptance examples |
| --- | --- | --- |
| [COND-WF-01, preparation](index.html#COND-WF-01/preparation) | Event context, phases, Arena number/name and empty configuration | TC-001/002/008/009, TC-AC-001/002/004 |
| [COND-WF-02, presence](index.html#COND-WF-02/preparation) | Fictional people, origins, batch review and basic check-in | TC-004/006/007, PRIV-010, TC-AC-003/017/018 |
| [COND-WF-03, reviewed round](index.html#COND-WF-03/review) | First-round pairs, Arena distribution and explicit publication | TC-009/011–013, MONO-016, TC-AC-005/006/008 |
| [COND-WF-04, Arena queues](index.html#COND-WF-04/published) | Per-Arena order, next athletes and explicit call | TC-002/009/010/013, TC-AC-002/005/007 |

| Starting scenario | Reproducible alternative |
| --- | --- |
| [Preparation](index.html#COND-WF-01/preparation) | Sixteen fictional players and three Arenas, before match preparation |
| [Round in review](index.html#COND-WF-03/review) | Eight draft matches ready for allocation and review |
| [Odd field](index.html#COND-WF-03/odd) | Nine players, four matches and a separate bye without fabricated match/statistics or an early ranking credit |
| [Published round](index.html#COND-WF-04/published) | Eight allocated matches and published queues |
| [Athletes called](index.html#COND-WF-04/called) | The first Arena's next match is called, without starting combat |
| [No Arenas](index.html#COND-WF-01/no-arenas) | Preparation retained, allocation/publication unavailable until configuration |
| [No participants](index.html#COND-WF-02/empty) | Empty list with quick/batch/test entry actions |
| [Minor safeguard](index.html#COND-WF-02/minor) | Presence does not settle an existing in-person verification requirement |
| [Invalid match](index.html#COND-WF-03/conflict) | Self-pairing is identified and cannot be distributed/published. Recreating the initial suggestion repairs the fictional fixture |
| [Loading failure](index.html#COND-WF-01/error) | Failed view remains in event context with an explicit retry |

## Design basis

Rendered references reviewed before authoring: WF-18/overview, WF-19/list, WF-20/detail and WF-14/unavailable/published/restricted at desktop and phone widths. This artifact extends their dark guild header, light operational workspace, form/list hierarchy and separate review notes. There was no existing detailed conduction reference to copy.

The [current design contracts](../README.md) govern the official neutral/steel palette, restrained wine/gold accents, angular controls, legible tables, semantic themes and responsive navigation. Old event colors or placeholder result-policy text in WF-14 do not supersede the current functional specs. WF-14's sporting result view will be reconciled when that part of the prototype is delivered.

The artifact reuses the official logo and existing locally licensed Source Sans 3, Grenze Gotisch and Roboto Slab files from the application wireframes. Schwager is unavailable in the repository, so Roboto Slab is an explicit display fallback. It is not presented as the approved Schwager font. No fonts or imagery were downloaded or generated.

## Verification

Run from the repository root with the installed Node.js runtime:

```sh
node --check specs/design/tournament-conduction/scenarios.js
node --check specs/design/tournament-conduction/prototype.js
node specs/design/tournament-conduction/verify.cjs
git diff --check
```

The built-in Node checks cover presence independence, minor safeguards, Arena validation/allocation, continuous allocation in batches, round invariants, odd-count byes, explicit publication and calls, retained published assignments, homonyms, event isolation, fixture references and local assets/spec references. They validate this simulation, not production authorization or an optimal Swiss engine. Behavioral checks must accompany the same changes they verify.

Browser review must cover the walkthrough, narrow/desktop layout, theme/input preservation, keyboard/menu, overflow, loaded assets, console and relevant empty/error/invalid/called states. Evidence is recorded in the [conduction validation record](../../../docs/tournament-conduction-validation.md). Opening via file is supported by the local asset structure, but direct file access may be blocked by the review tool's browser policy and must not be claimed as tested if it was not.

## Functional sources and limits

[Conduction](../../tournaments/conduction.md), [Monomachia sporting rules](../../tournaments/events/monomachia-2027.md#conduction-rules), [results](../../tournaments/results.md) and [global admin access](../../identity/authentication-and-access.md#authorization-rules) govern the intended product.

This preparation view represents the admin workspace only. It does not imply spectator access to presence lists, administrative notes or requirements. The later shared sporting view must preserve RES-004/011 and internal-event restrictions. Existing privacy/youth publication decisions are not resolved by showing fictional people here.

Pairings use a reviewed first-round initial order and prepared alternate fixtures. No complete Swiss search, live network transport, production authorization, real result, storage schema or integration contract is implemented. Editing participants after drafting pairings is intentionally outside this initial simulation. Reset to prepare a new list. That prototype limit does not establish a new production participation rule.
