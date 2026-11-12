# Karlbrüder shared UI components

**Created**: 2026-11-04
**Last updated**: 2026-11-11

| Field | Value |
| --- | --- |
| Status | Draft — product direction approved; component implementation pending inspection |
| Scope | Platform foundation: reusable visual and interaction components |
| Applications | landing, frontend |
| Sources | [Web design foundations](web-design-foundations.md) (`KBWD`); Karlbrüder Identity Manual; [application wireframe review](app-wireframes/README.md) and supplied `wireframes.css` and `wireframes.js` (2026-11-04); approved web UI decisions (2026-11-04) |

## Goal

Visitors, participants and staff need consistent, readable and accessible interface components, while Karlbrüder's angular geometry, visible Schwager/Grenze Gotisch typography and restrained metal-toned palette distinguish the product from a generic admin system.

Developers and agents must be able to build new forms, tournament cards, menus, status messages and administrative layouts without redeciding the visual rules for every feature. **This capability specifies presentation and generic interactions, not domain behavior.**

## Scope and boundaries

**Owns:** shared component design contracts (navigation shell, buttons, links, surfaces, cards, form presentation, messages, statuses, dialogs, tabs, tables, responsive containers, spacing/typographic roles, ornaments and focus/hover/disabled/loading states); reuse between public and operational layouts.

**Does not own:** authorization, registration state machines, payment/proof business rules, staff permissions, tournament capacity, data contracts, endpoint paths, business wording, final site navigation items, or whether future modules exist. Those remain in their owning product specifications.

**Delivery boundary:** the component set becomes usable as reusable building blocks; adapting the design-review screens is a subsequent implementation task governed by the owning feature specs and their accepted states. The existing wireframes are reference examples only.

## Rules

### Geometry, typography and shared layout

- **KBUI-001:** Regular buttons, input outlines, panels and cards must use a **square-cornered/angular** geometry; pill and circular shapes are restricted to functional exceptions such as badges, avatars and indicators.
- **KBUI-002:** Components must consume the semantic tokens and theme rules of `KBWD`, preserving the approximately 80% neutrals / 15% steel / 5% wine-and-gold color balance as a **nonbinding visual guide**.
- **KBUI-003:** Components must not use primitive accent colors as arbitrary body-text or state colors when those combinations fail contrast; accessible semantic variants are permitted.
- **KBUI-004:** Short prominent action labels and featured card headings may use **Schwager W04 Black**; historical/editorial headings and selected application headings may frequently use **Grenze Gotisch**; dense controls, user-entered values and help/validation text must use **Source Sans 3** when necessary for reliable reading.
- **KBUI-005:** Responsive containers must size according to content purpose: forms and reading blocks should have comfortable maximum widths, while tables and dense admin lists may use more horizontal space. Layouts must not stretch a single text column across an ultrawide screen.
- **KBUI-006:** The application shell and site shell may have different compositions, but repeated tokens, brand geometry and basic control behavior must remain coherent.

### Buttons, links and interaction states

- **KBUI-007:** Buttons must have identifiable **primary**, **secondary** and **tertiary/text** variants, plus **destructive** treatment where an owning feature permits a destructive action. A variant indicates action hierarchy, not a new business permission.
- **KBUI-008:** Primary-action color must be **contextual** to theme and surface. Vinho/Ouro are sparing accents, not a requirement that every button use gold/wine fills. Text and icon contrast must remain accessible in all states.
- **KBUI-009:** Interactive controls must support visually and programmatically distinguishable hover (where applicable), keyboard focus, disabled and pending/loading states without depending solely on color.
- **KBUI-010:** Disabled actions must not be visually confused with actions currently processing. A loading/pending state must not show an unsupported success outcome.
- **KBUI-011:** Text links must remain distinguishable from nearby static copy by more than a subtle color difference, including keyboard focus states.
- **KBUI-012:** Action labels must communicate what the control does. Short ornamental/type-driven labels cannot replace clear accessible names.

### Navigation and shell components

- **KBUI-013:** The public website header must support a **minimalist** composition: official logo on the left, navigation and theme control on the right at sufficiently wide viewports. Exact menu entries are owned by the public-site product/navigation specs.
- **KBUI-014:** The application's regular desktop shell must support a **horizontal dark guild-branded header**, as in the current wireframe direction; business workflows remain in the content area.
- **KBUI-015:** On narrow application viewports, primary navigation must collapse into an accessible **hamburger menu** rather than relying on multiple compressed horizontal links.
- **KBUI-016:** The application may provide a differentiated staff/admin workspace layout while maintaining brand identity, shared controls and appropriate access boundaries. A future sidebar is not required by this release.
- **KBUI-017:** Navigation controls must announce their labels, current location and expanded/collapsed state where appropriate; mobile menus must be operable and dismissible via keyboard.
- **KBUI-018:** The shared theme control must have an accessible name and a state perceivable without interpreting a sun/moon icon alone.

### Surfaces, cards and information density

- **KBUI-019:** **Flat surfaces with thin, legible boundaries** are the default for forms, administrative lists and ordinary informational cards.
- **KBUI-020:** **Subtle elevation** may distinguish featured tournament cards or selected promotional modules; shadows are not required for every surface and must not replace borders as the only structural cue.
- **KBUI-021:** Event cards may display event-specific marks, imagery and controlled accent colors, but their common action, status and metadata components must keep KB semantics and accessibility.
- **KBUI-022:** Secondary steel-toned structure should remain visible without treating the base Cinza Aço value as universally accessible small text or low-contrast border against every background.
- **KBUI-023:** Cards must preserve readable titles, metadata and actions when optional images, location, prices or schedule values are missing. Unknown values must not be invented or shown as confirmed.

### Forms and operational data

- **KBUI-024:** Form labels must be persistently identifiable, associated with their fields and legible even when the field contains input; placeholders must not be the sole source of a field label.
- **KBUI-025:** Form values, field instructions, privacy disclosures, validation and error explanations must favor Source Sans 3 and readable layouts; brand display type must not override functional clarity.
- **KBUI-026:** Required/optional state, input constraints and errors must be explained through accessible text or equivalent programmatic association, not color alone.
- **KBUI-027:** Validation feedback must identify the specific affected field or section; focus/error summary behavior must not imply submission success when validation fails.
- **KBUI-028:** Input, select, checkbox, radio, textarea, upload and date controls must have coherent focus, disabled, invalid and completed presentations. The permitted values, file limits and required steps come **only** from the owning feature spec.
- **KBUI-029:** Tables and dense operational data must use readable headings, clear row/column relations and practical narrow-width strategies. If an inner table scroller is needed, it must not create unintended horizontal overflow for the whole page or hide essential actions without discoverability.
- **KBUI-030:** Dialogs and overlays must expose a clear title, closing path and appropriate keyboard/focus behavior; they must not become a substitute for workflow or permission checks specified in backend/domain requirements.

### Statuses, feedback and motion

- **KBUI-031:** Success, error, warning, informational and pending notices must include **text plus a suitable icon/label**, with accessible semantic colors as a secondary cue.
- **KBUI-032:** The interface must distinguish **business statuses that are materially different** under the owning specs, including “lotado mas inscrições abertas”, “encerrado”, “pagamento em análise”, “pagamento aprovado, em espera” and “inscrição confirmada” where applicable. This rule governs clear presentation, not state transitions.
- **KBUI-033:** A displayed confirmation, success notice, progress step or badge must reflect the actual state supplied by the owning workflow; visual feedback may not preempt backend verification.
- **KBUI-034:** Empty, loading, unavailable, error and not-configured views must be distinguishable, preserve relevant context and offer only actions supported by the owning feature.
- **KBUI-035:** Motion and feedback animations must be restrained and functional; hover-only or scroll-triggered effects must not block completion and nonessential movement must respect reduced-motion preference.

### Assets and exceptions

- **KBUI-036:** Historical flourishes in reusable components should be minimal: occasional separators, title treatments or background textures, not ornamental borders on each form field, table or action.
- **KBUI-037:** Components serving event registration, proof upload, payments or staff decisions must remain standard Karlbrüder components even when adjacent event headers/covers have their own visual brand.
- **KBUI-038:** New component variants must not silently introduce additional domain statuses, permissions, navigation destinations or routes absent from an owning feature spec.

## User flow or contract

### Component selection by context

| Context | Default presentation | Supported exceptions |
| --- | --- | --- |
| Public site navigation | Minimal logo-left/navigation-right header | Collapsed mobile navigation; theme control |
| Application navigation | Dark horizontal brand shell | Hamburger on narrow screens; distinct admin workspace |
| Form page | Constrained content width, flat panels, persistent labels | Wider forms only when structurally justified |
| Administrative table | Readable compact rows and access to available width | Inner scroll or responsive row view where necessary |
| Tournament card | Flat or subtly elevated card with event artwork | Event-specific accent/mark; standard KB actions |
| Primary action | Context-aware fill/contrast with square corners | Prominent Schwager short label where legible |
| Historical/editorial heading | Frequent contextual Grenze Gotisch | Schwager for prominent brand/sport heading |
| Field/error/status explanation | Source Sans 3, text + meaningful icon where appropriate | No ornamental font for dense/critical information |

### Existing wireframes: design review mapping

The following are **presentational references**, not new product policies or evidence of implementation:

| Wireframe | Component emphasis | Owning behavior remains in |
| --- | --- | --- |
| `WF-01/public`, `WF-02/open/full/unknown` | Catalog cards, event marks, event details, unknown facts | `CAT`, `CAP`, `MONO` |
| `WF-03/login`, `WF-03/unavailable` | Authentication form, field help, service error | `AUTH` |
| `WF-04/adult/minor/invalid/duplicate` | Form groups, field validation, consent presentation | `REG`, `PRIV` |
| `WF-05/initial/rejected/fileerror` | Upload presentation, validation, resubmission cues | `PAY` |
| `WF-06/review/confirmed/waitlist` | Distinct status notices and step indicators | `REG`, `PAY`, `CAP` |
| `WF-09/queue`, `WF-10/available/full/race` | Staff table, review controls, safeguards and conflict feedback | `ADM`, `PAY`, `CAP` |
| `WF-11`–`WF-16` | Future or later-capability shell patterns | Respective owning specifications; not first-release delivery commitments |
| `WF-17/current/currentadmin` | Existing home actions in a proposed layout | `AUTH`, `REG` |
| `WF-17/list/empty/loading/error/admin`, `WF-18`–`WF-22` | Proposed home and staff workspace states | `AUTH`, `REG`, `ADM`, `CAT`; not evidence of delivery |

### Functional boundaries

- Styling a button “Confirmar inscrição” does not establish that an enrollment is complete or a seat reserved.
- Rendering a payment proof upload does not establish that the payment succeeded; the existing `PAY` rules govern verification.
- Showing an internal tournament or staff action is controlled by `CAT`/`AUTH`/`ADM`, not a CSS visibility rule.
- A custom event theme must not change shared controls so much that their meaning or interaction becomes inconsistent across events.

## Acceptance criteria

- **KBUI-AC-001:** Given regular controls in both applications, when their geometry is inspected, then buttons, fields and ordinary panels use the approved angular visual language without default rounded-card/pill styling.
- **KBUI-AC-002:** Given a button in primary, secondary and tertiary variants, when rendered on each supported theme, then the action hierarchy is distinguishable and label/icon/focus contrast remains accessible.
- **KBUI-AC-003:** Given a disabled action and a pending action, when both states are presented, then the user can distinguish them without color-only clues and no false success is announced.
- **KBUI-AC-004:** Given keyboard-only navigation, when moving through buttons, links, forms and menus, then focus is visible, semantic labels are available, and controls can be used without a mouse.
- **KBUI-AC-005:** Given a narrow application viewport, when the header is rendered, then navigation is accessible through a hamburger control and the interface does not depend on squeezed horizontal links.
- **KBUI-AC-006:** Given an opened mobile navigation menu, when the user activates its close control or an appropriate keyboard dismissal, then it closes while preserving understandable focus/navigation behavior.
- **KBUI-AC-007:** Given a normal data-entry form, when the field receives a value or focus, then its label stays identifiable and field instructions remain available.
- **KBUI-AC-008:** Given an invalid form state such as `WF-04/invalid`, when the errors appear, then the affected inputs and explanations are identifiable and the UI does not report the action as successful.
- **KBUI-AC-009:** Given proof rejection in `WF-05/rejected`, when the user reads the notice, then the reason and supported next step are communicated in text with an icon/semantic cue, without claiming the registration was cancelled.
- **KBUI-AC-010:** Given `WF-02/full` and `WF-02/closed`, when the event states are displayed, then the UI visibly distinguishes a full-but-still-open event from a closed event.
- **KBUI-AC-011:** Given `WF-06/waitlist` and `WF-06/confirmed`, when their panels render, then the paid-waiting state never visually claims that a place has been confirmed.
- **KBUI-AC-012:** Given `WF-02/unknown`, when event configuration is missing, then the component identifies the missing/unknown information without replacing it with example dates, fees or venue claims.
- **KBUI-AC-013:** Given an ultrawide viewport and a narrow side-by-side browser window, when rendering a form, then the reading/form width remains practical and essential controls fit without page-level clipping.
- **KBUI-AC-014:** Given a dense staff list on a narrow viewport, when the user accesses its rows/actions, then the table or alternate representation remains operable and document-level horizontal overflow is avoided.
- **KBUI-AC-015:** Given a featured event card and an ordinary administrative card, when compared, then the featured card may use restrained elevation while the administrative card remains primarily flat and bordered.
- **KBUI-AC-016:** Given a tournament with a custom visual identity, when opening its registration, then its name/logo or accent remains recognizable without changing the structure or meaning of the KB form controls.
- **KBUI-AC-017:** Given a dialog opened by a supported workflow, when using keyboard navigation, then the title, actions and dismissal behavior are accessible and focus is managed appropriately.
- **KBUI-AC-018:** Given a page in either theme, when the theme preference changes, then form labels, controls, statuses and focus styles adopt valid semantic tokens without losing entered values.
- **KBUI-AC-019:** Given a user requesting reduced motion, when interactive transitions run, then nonessential animation is reduced or omitted without hiding information.
- **KBUI-AC-020:** Given a staff payment-review state such as `WF-10/race`, when conflicting capacity information is displayed, then the UI communicates the backend outcome accurately and does not represent a successful confirmation that was not granted.

## Implementation baseline

Reviewed **2026-11-04** from supplied design artifacts only. **No production component library or codebase was inspected; no implementation is claimed.**

- The supplied wireframe review described a static HTML/CSS/JS artifact with 16 screens and 57 states on 2026-11-04. The [repository wireframe review](app-wireframes/README.md#design-verification) records 22 screens and 103 states checked on 2026-11-05. It separates illustrative layout from product rules.
- `wireframes.css` contains example `.app-header`, `.button`, `.panel`, `.event-card`, `.field`, `.notice`, `.tag`, `.table-wrap`, `.auth-layout` and responsive container-query rules; values include `--radius:8px`, Arial and Georgia, which do **not** constitute approved final geometry or typography.
- `wireframes.js` contains state-specific screen renderers and event-driven demo navigation, but states, forms, uploads, payments and authentication are simulations, not tested production flows.

## Open questions

None blocking this shared component contract. Detailed component measurements and implementation mechanics are engineering/design decisions after inspecting the actual frontend codebase.

## Implementation decisions

- Inspect existing components and route composition in `landing/` and `frontend/` before choosing a shared package, CSS modules, utility framework, design-token format or component library. No technology is mandated here.
- Implement primitive colors and semantic colors separately; account for theme and component context. Test actual contrast, not just token names.
- Avoid hard-coded event colors inside generic form fields; event identity should enter through explicit banner/accent/cover slots without overriding universal form/status controls.
- Keep state vocabulary and access rights sourced from `CAT`, `AUTH`, `REG`, `PAY`, `CAP`, `ADM` and `PRIV`. Design fixtures must not be treated as live tournament facts.
- Use the existing wireframe IDs/states in review and delivery issues; a design ref such as `WF-05/rejected` supplements `PAY-004` / its acceptance criterion, rather than replacing it.
- Maintain accessible component states, focus, semantics, readable widths, keyboard navigation and reduced motion across both themes before considering the visual treatment done.

## Related specifications

- [Web design foundations](web-design-foundations.md) — shared tokens, themes, type and brand (`KBWD`).
- [Institutional website experience](institutional-site-experience.md) — public-page application of components (`KBWEB`).
- [Application wireframe review](app-wireframes/README.md) — WF-01 through WF-22, illustrative states.
- Owning behavior specs: [public website](../public-website/presentation-and-navigation.md) (`WEB`), [catalog](../tournaments/catalog.md) (`CAT`), [registration](../tournaments/registration.md) (`REG`), [payments and confirmation](../tournaments/payments-and-confirmation.md) (`PAY`), [capacity and waitlist](../tournaments/capacity-and-waitlist.md) (`CAP`), [administration](../tournaments/administration.md) (`ADM`), [consent and privacy](../tournaments/consent-and-privacy.md) (`PRIV`), and [authentication and access](../identity/authentication-and-access.md) (`AUTH`).
