# Karlbrüder web design foundations

**Created**: 2026-11-04
**Last updated**: 2026-11-11

| Field | Value |
| --- | --- |
| Status | Draft — product direction approved; implementation not verified |
| Scope | Platform foundation: shared visual identity and design constraints |
| Applications | landing, frontend |
| Sources | Karlbrüder Identity Manual (visual identity, applications and governance; decisions approved by the product owner); [public website presentation](../public-website/presentation-and-navigation.md) and [application wireframe review](app-wireframes/README.md) supplied for the 2026-11-04 design review; product-owner web-design decisions of 2026-11-04 |

## Goal

Visitors, members and staff should recognize Karlbrüder across the public website and tournament application, while each interface remains appropriate to its purpose. Developers and coding agents need one source of truth for colors, typography, themes, imagery, geometry and accessibility without rewriting the business behavior specified elsewhere.

The intended expression is **Heráldica Contemporânea**: contemporary sport-oriented geometry, authentic fencing/community photography, distinctive historical typography and restrained historical detail. The public site is more expressive; the application is more operational.

## Scope and boundaries

**This spec owns:** shared visual direction; primitive color palette and nonbinding color-balance guidance; semantic token requirements; shared typography rules; logo usage; theme behavior across the two applications; cross-cutting imagery, ornamentation, motion, accessibility and responsive constraints.

**This spec does not own:** page composition and navigation (owned by the public-site spec or existing `WEB` spec); specific button, card and form patterns (owned by `shared-ui-components.md`); tournament registration, authentication, payments, capacity, consent and administration; API design or data models; final website copy; licenses or rights not yet verified.

**Delivery boundary:** this spec defines a design contract, not proof that either application has been migrated. All existing domain behavior and environment-specific handoffs remain governed by their owning specifications. The application must retain its function-first presentation even when sharing tokens with the more expressive public site.

## Rules

- **KBWD-001:** Both applications must express Karlbrüder's **Heráldica Contemporânea** identity. The primary expression is **Heráldica Minimalista Esportiva**; historical institutional treatments may supplement it contextually.
- **KBWD-002:** The regular product UI must not present medieval fantasy, RPG styling, extremist/nationalist symbols, or artificially aristocratic ornamentation as the organization's defining aesthetic.
- **KBWD-003:** The official primitive colors are Carvão `#19191B`, Marfim `#F2EEE5`, Vinho Profundo `#782A36`, Ouro Antigo `#B49A61` and Cinza Aço `#777B80`.
- **KBWD-004:** As a **visual guideline, not a measurable quota**, UI surfaces and treatments should read approximately **80% Carvão/Marfim**, **15% Cinza Aço** and **5% Vinho/Ouro combined**. Photographs and event-specific artwork are excluded from this estimate; accessibility and component semantics override any approximate ratio.
- **KBWD-005:** Vinho and Ouro should be restrained accents, not default large-area backgrounds throughout the regular UI. Cinza Aço should have a meaningful supporting role in boundaries, secondary surfaces, separators and other non-primary structure.
- **KBWD-006:** Color roles must be exposed through **semantic tokens** for both light and dark presentations (including canvas, surface, raised surface, text, subdued text, border, action, focus and state). Screens must not rely on manually repeating literal palette values for every component.
- **KBWD-007:** Semantic status colors beyond the five brand primitives may be used when needed for accessible error, warning, success and informational feedback. Status must also be communicated by text and/or an appropriate icon, not color alone.
- **KBWD-008:** In a fresh browser context without a saved theme preference, the **public website** must start in the dark presentation.
- **KBWD-009:** The **application** must retain its approved hybrid baseline: dark guild-branded header/shell with light, high-legibility functional surfaces as appropriate to forms, tables and operational tasks. This baseline must not be replaced by a mandatory fully dark form experience.
- **KBWD-010:** Both applications must provide an accessible manual switch between light and dark presentation, and the selected preference must be **shared** between `karlbruder.com` and `app.karlbruder.com` within the same browser where shared client state is available. Their internal layouts may respond differently to that same preference.
- **KBWD-011:** Theme switching must maintain content, form values, focus where feasible, navigation context and available actions. Theme preference must survive normal navigation and subsequent visits while the browser retains the chosen preference.
- **KBWD-012:** The **Schwager W04 Black** is the primary display typeface for prominent headings, brand-oriented labels and short button/card labels when legible and legally usable in the delivered medium.
- **KBWD-013:** The **Grenze Gotisch** is the historical typeface and **may appear frequently in headings**, editorial sections and selected application/event titles; it must not be confined to rare ceremonial inscriptions. It must not compromise readability of essential controls.
- **KBWD-014:** **Source Sans 3** is the functional typeface for forms, help text, tables, statuses, error/success explanations, dense data and long content. It is a necessary support, not the predominant visual brand voice for short display labels.
- **KBWD-015:** Font assets must not be embedded or redistributed unless their actual license permits the intended use. Unavailable fonts require an accessible fallback with clearly documented visual differences; agents must not pretend a substitute is the approved family.
- **KBWD-016:** Official logo and heraldic geometry must remain recognizable and must not be redrawn from memory. The brand name does not require the subtitle “Esgrima Histórica”, since Karlbrüder also practices Olympic fencing.
- **KBWD-017:** The general component geometry must be **angular, with visually straight/square corners**. Intentional exceptions such as circular avatars, status markers and small controls must be justified by their function rather than adopted as a default rounded visual language.
- **KBWD-018:** Public-facing photography must prioritize authorized, authentic Karlbrüder members training, competing, learning and socializing. Generic photographs must not be presented as documentary images of the group.
- **KBWD-019:** Historical manuscript imagery can appear as subtle backgrounds or prominent editorial illustrations; botanical ornamentation, borders and dividers should remain **discreet**, typically in selected separators or occasional backgrounds rather than every UI element.
- **KBWD-020:** Regular public-site hero areas should prioritize **photography**, not autoplay/background video. Videos may appear in dedicated content areas when appropriate.
- **KBWD-021:** Motion may be moderately expressive in presentation sections but must not obstruct reading or interactions. Decorative motion must be reduced or disabled when the user requests reduced motion.
- **KBWD-022:** Text, controls, focus indicators and meaningful non-text interface graphics must meet applicable **WCAG 2.2 AA** requirements; ordinary text should meet at least 4.5:1 and large text at least 3:1 contrast, subject to the guideline's exceptions.
- **KBWD-023:** Components must be operable through keyboard, with visible focus. Meaningful images must expose suitable alternatives and decorative assets must not create redundant announcements to assistive technology.
- **KBWD-024:** The layout must adapt to narrow browser windows used side-by-side as well as ultrawide screens; critical content, actions and form labels must not clip, overflow the page horizontally or become unreadably wide.
- **KBWD-025:** Both applications must reuse the shared design contract while retaining distinct page composition: the **public website** can be photographic/editorial, while **application and staff** experiences prioritize readable tasks and data density.
- **KBWD-026:** A tournament may have its own logo, cover artwork, detail-page treatment and identifiable accent colors; the reusable registration, authentication, proof-upload, payment and staff controls remain Karlbrüder components. Event accent colors must not silently redefine the meaning of actions or statuses.
- **KBWD-027:** The internal identity manual, unpublished assets, license-restricted source files and personal documents must not be exposed in public bundles. Public site content may describe selected aspects of the group's history and identity.

## User flow or contract

### Shared identity and theme contract

1. A visitor opening `karlbruder.com` with no stored preference receives the **dark** site presentation.
2. The visitor can switch to light mode using an identifiable, keyboard-accessible control; the current page stays in place.
3. A subsequent visit to `app.karlbruder.com` in the same browser uses the **same selected preference**, without requiring another choice. The application may still employ contrasting light work surfaces within its approved hybrid visual system.
4. A change made in the application is reflected when the visitor next opens or navigates to the public site under the same shared preference context.
5. The public site may use photo-led editorial layouts and subdued manuscript ornamentation; the application uses angular, flat functional UI with historical typography and measured accent usage.
6. An event-branded tournament detail can be distinct, while registration and administrative controls return to the standardized KB presentation.

Theme behavior must not be conflated with sign-in state. Sharing theme preference does **not** imply sharing authentication sessions, private data or tournament context.

### Visual contract

| Area | Approved direction | Guardrail |
| --- | --- | --- |
| Color distribution | Roughly 80% neutrals / 15% steel / 5% wine+gold | Not a testable percentage; excludes photos and event artwork |
| Website baseline | Dark, photographic and expressive | Manual light option; no inaccessible ornament overlays |
| Application baseline | Dark header plus readable light operational surfaces | Same user preference; do not force an all-dark form |
| Buttons and containers | Angular geometry | Accessible sizing and focus take precedence |
| Display typography | Schwager; frequent contextual Grenze Gotisch | Source Sans 3 for data-rich and critical functional text |
| Brand imagery | Actual community activity | Use licensed/authorized files in release artifacts |
| Historic imagery | Occasional backgrounds, illustrations and dividers | Never impair interaction or readability |
| Tournament identity | Event-specific imagery, accents and detail-page treatment | KB-controlled registration and administration UI |

### Palette and contrast cautions

The **primitive** colors are not automatically valid semantic text colors. As calculated from the approved hex values, Cinza Aço on Marfim is approximately **3.68:1**, Cinza Aço on Carvão approximately **4.12:1**, Vinho on Carvão approximately **1.82:1**, and Ouro on Marfim approximately **2.34:1**. These combinations do **not** satisfy the 4.5:1 requirement for ordinary body text. Semantic tokens may require darker/lighter accessible variants while keeping the five primitives as identity references.

## Acceptance criteria

- **KBWD-AC-001:** Given a clean browser with no theme preference, when the visitor loads the public site, then dark mode is applied.
- **KBWD-AC-002:** Given any page with the theme switch, when the user toggles the presentation, then the page changes theme without losing its current content, unfinished field values or navigation context.
- **KBWD-AC-003:** Given a light-mode preference selected on the public site, when the same browser opens the application on the production subdomain, then the application acknowledges and applies that preference; the reverse direction also works.
- **KBWD-AC-004:** Given no stored theme preference, when the application opens, then its shell uses the guild's dark presentation and operational forms remain readable on appropriate light surfaces.
- **KBWD-AC-005:** Given a shared component used in both applications, when a theme changes, then semantic surface/text/border tokens update consistently without one-off hard-coded overrides.
- **KBWD-AC-006:** Given a representative page with headings, button labels, forms and status messages, when reviewed against type roles, then Schwager and Grenze Gotisch are visibly present where approved and Source Sans 3 handles dense functional content.
- **KBWD-AC-007:** Given the site's regular UI at design review, when palettes are inspected, then neutrals dominate, steel has a visible supporting role, and wine/gold remain restrained. No acceptance failure is based solely on a numerical pixel-area ratio.
- **KBWD-AC-008:** Given all text and interactive states in both themes, when contrast and non-text indicators are checked, then applicable WCAG 2.2 AA criteria are met.
- **KBWD-AC-009:** Given keyboard-only use, when the user navigates the shared UI, then focus is visible and essential actions are reachable without hover or pointer input.
- **KBWD-AC-010:** Given narrow, medium, desktop and ultrawide viewports, when pages are rendered, then essential content and actions fit without page-level horizontal clipping and long reading sections remain comfortably constrained.
- **KBWD-AC-011:** Given reduced-motion preference, when the site is scrolled and navigated, then nonessential movement is suppressed or meaningfully reduced.
- **KBWD-AC-012:** Given a tournament with its own palette and mark, when viewing details and then proceeding to registration, then the event remains identifiable but the registration controls use the shared KB interface and semantic feedback colors.
- **KBWD-AC-013:** Given a proposed production release, when its assets are audited, then no unauthorized font files, internal manual, personal images/documents or other private source artifacts appear in publicly served assets.

## Implementation baseline

Evidence examined **2026-11-04**, limited to files supplied for this design review; the repository and live deployed interfaces were **not** inspected or changed.

- Supplied `presentation-and-navigation.md` reports `landing/src/App.js` routes for homepage and `/monomachia`, and specifies the public-site/application split (`WEB-001`–`WEB-005`). This is a statement in the supplied spec, not independent verification of deployment.
- The supplied wireframe review described 16 application screens and 57 illustrated states on 2026-11-04. The [repository wireframe review](app-wireframes/README.md#design-verification) records 22 screens and 103 states checked on 2026-11-05. The offline artifact does not implement backend, authentication, uploads or persistence.
- Supplied `wireframes.css` currently defines an illustrative charcoal/light-workspace treatment with older event-related wine/clay/cream values and Arial/Georgia. These are **existing design-artifact choices**, not proof of the current application's production CSS or the newly approved design system.
- The approved brand font file and SVG artwork were available as conversation inputs; neither web-font licenses nor production bundle contents were verified.

## Open questions

None at the product-foundation level. Specific page arrangements and component states are owned by their respective specs. The exact mechanism of cross-subdomain preference synchronization is an implementation decision, not an unresolved product requirement.

## Implementation decisions

- Inspect both application projects before choosing the token implementation, CSS strategy or theme-state mechanism; do not assume a framework, styling library or existing reusable component package.
- Evaluate a shared preference mechanism appropriate to `karlbruder.com` / `app.karlbruder.com` and their corresponding development origins. A shared-domain preference cookie is one possible solution; `localStorage` by itself is origin-scoped and does not directly synchronize subdomains. Do not broaden cookie scope to authentication or personal data merely to implement visual preference.
- Expose primitive palette tokens separately from accessible semantic tokens, per theme and per surface context. Verify contrast before fixing semantic values; do not assume the primitive steel can serve as small-body text.
- Preserve the actual brand SVG/logo geometry and check licensing before bundling fonts. The supplied proprietary Schwager font is **not** permission to redistribute it in a public repository or application build.
- Validate narrow-browser split-screen widths, common phones, desktop and ultrawide viewports. Test text scaling, focus, reduced motion, icon-plus-text state messages and absence of overflow.
- Use page-specific and component-specific specs as the canonical owners of layout details and interactions. Keep backend and tournament state transitions in their existing specs.

## Related specifications

- [Shared UI components](shared-ui-components.md) — component appearance and state communication (`KBUI`).
- [Institutional website experience](institutional-site-experience.md) — landing-specific visual experience (`KBWEB`).
- [Public website presentation and navigation](../public-website/presentation-and-navigation.md) (`WEB-001`–`WEB-005`) — canonical owner of public-site navigation, registration handoff and public facts.
- [Application wireframe review](app-wireframes/README.md) — WF-01 through WF-22 are supporting design material, **not** proof of implementation or new business policy.
- Karlbrüder Identity Manual — internal reference, not intended to be copied into a public build.
