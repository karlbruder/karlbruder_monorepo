# Karlbrüder institutional website experience

**Created**: 2026-11-04
**Last updated**: 2026-11-11

| Field | Value |
| --- | --- |
| Status | Draft — visual and UX direction approved; high-fidelity wireframes pending |
| Scope | Initial public website redesign and visual presentation, with modular future extension |
| Applications | landing |
| Sources | [Public website presentation and navigation](../public-website/presentation-and-navigation.md) (`WEB-001`–`WEB-005`); [web design foundations](web-design-foundations.md) (`KBWD`); [shared UI components](shared-ui-components.md) (`KBUI`); Karlbrüder Identity Manual and product-owner homepage/UI decisions approved 2026-11-04; [application review wireframes](app-wireframes/README.md) only for continuity at the handoff |

## Goal

A visitor arriving from search, Instagram, Facebook or a shared link should rapidly understand that Karlbrüder is a **contemporary Brazilian community practicing historical and Olympic fencing**, see its real members training, competing and socializing, discover the available activities and find an uncomplicated path to learning about classes or a relevant event.

The redesigned public website should be visually distinctive without becoming a medieval-themed interface, and should remain maintainable as the organization expands its web presence.

## Scope and boundaries

**Owns:** the public site's design/experience layer: visible content hierarchy, homepage hero composition, photography, historical visual detail, navigation presentation, page transitions, desktop/mobile behavior, dark/light visual presentation, and a clear introductory path toward activities and classes.

**Does not own:** exact marketing copy, course schedules, venue addresses, event configuration or prices; tournament registration, account sessions, uploads, payment, capacity or private data; backend APIs; new product modules; official identity-manual editing; final navigation route paths beyond those already established by the `WEB` spec.

**Canonical boundary:** the existing [public website spec](../public-website/presentation-and-navigation.md) owns `WEB-001`–`WEB-005`, including environment-specific links to the registration application (`WEB-003`) and public event facts (`WEB-004`). This spec refines how those experiences are **presented**, but may not contradict their behavior. The public site does not become a second registration form or a replica of the application.

**Delivery boundary:** medium-fidelity wireframes and the design contract can be accepted first; high-fidelity examples and actual public-site implementation follow in subsequent delivery work. No feature is declared implemented by approving this document.

## Rules

### Brand-led landing experience

- **KBWEB-001:** The redesigned site must present Karlbrüder as a **current, active fencing community**, not as medieval reenactment, a single-weapon club or only a competitive team.
- **KBWEB-002:** The public homepage must make both **esgrima histórica** and **esgrima olímpica** discoverable without requiring a novice to understand technical fencing terminology first.
- **KBWEB-003:** The first major homepage composition must use a **split hero** on wide screens: high-impact title/introduction and clear action(s) in one region, authorized real Karlbrüder photography in the other.
- **KBWEB-004:** Selected later sections may place text over photographic compositions to create a fluid scrolling rhythm, provided the reading surface, overlays and responsive layout maintain legibility and do not obscure essential action labels.
- **KBWEB-005:** A primary visitor path must lead toward **classes and how to participate**, rather than making a newcomer search across unrelated pages. Secondary paths can introduce the community, modalities, history and events.
- **KBWEB-006:** Community imagery must show a **mixture of training, teaching, competition and social life**, using both large editorial photographs and photo mosaics when appropriate.
- **KBWEB-007:** The homepage may include a **short preview** of the heraldry/history with a path to more information, but a dedicated large heraldry section is not a launch requirement. Final page copy and content priorities remain editorial decisions.

### Navigation and mobile experience

- **KBWEB-008:** The public site header must remain **minimalist**: authentic KB logo at left; concise navigation and theme control at right on wide screens, with responsive handling at narrow widths.
- **KBWEB-009:** The navigation must provide clear, discoverable access to activities, relevant social channels and the application handoff already required by `WEB-001`–`WEB-003`, without exposing private application workflows in the public-site shell.
- **KBWEB-010:** The public site may have a single-page presentation with relevant event routes; route creation and URL behavior must remain consistent with `WEB` and the existing deployment configuration. This spec must not invent new production route paths.
- **KBWEB-011:** Information about classes across cities/nuclei must be organized as **one coherent classes experience**, rather than forcing one unrelated page per city. The exact UI control (sections, filters, tabs) is not yet prescribed.
- **KBWEB-012:** The wide-screen split hero must adapt into a clear stacked composition on mobile, preserving the logo, introduction, photograph and classes call to action without horizontal overflow or unreadable text overlays.
- **KBWEB-013:** Content width must be responsive to narrow side-by-side browser windows as well as ultrawide displays, using bounded reading measures and purposeful extra whitespace, not ever-growing paragraph lines.

### Visual language

- **KBWEB-014:** The public site must start in the **dark** visual presentation when no preference exists, and expose the shared manual theme control specified by `KBWD`.
- **KBWEB-015:** The website must apply the approved **approximate** 80% neutral / 15% steel / 5% wine-and-gold composition as a visual guide. Photographs and artwork are not counted; accessibility and content needs take priority.
- **KBWEB-016:** Principal public headings and short brand-forward actions must express **Schwager**; **Grenze Gotisch may appear frequently in headings** and historical/editorial transitions; Source Sans 3 supports lengthy, numerical and functional content.
- **KBWEB-017:** Buttons, content panels and navigation elements must predominantly follow the approved **angular geometry**, not a rounded/pill-heavy design language.
- **KBWEB-018:** Ornamental treatment must be **discreet**: geometric section separators may be common, with occasional vegetal scrolls, manuscript artwork or darkened historical textures in selected sections and backgrounds.
- **KBWEB-019:** Historical manuscripts may be used both as subdued backgrounds and as prominent editorial illustration, subject to rights, contextual accuracy and legible presentation.
- **KBWEB-020:** The default homepage hero must be **photographic, not video-led**. Video may appear in dedicated sections/pages where editorially relevant, with appropriate controls and media fallbacks.
- **KBWEB-021:** Scrolling and interaction transitions may be **moderate** and expressive, but cannot obstruct navigation, make content inaccessible or ignore reduced-motion preferences.

### Events and application handoff

- **KBWEB-022:** Public event pages may have distinctive event art, mark and palette (e.g., Monomachia), while retaining readable site navigation, an identifiable KB affiliation and accessible primary actions.
- **KBWEB-023:** Public registration calls to action must follow the existing `WEB-003` handoff to `/tournaments/registration` on the **environment-specific application origin**, preserving the existing division of responsibilities.
- **KBWEB-024:** Public event facts must be maintained in the public site in accordance with `WEB-004`, not silently fetched from or invented on the basis of assumed backend state. Unknown venue, fees, schedule or registration values must be handled without manufactured certainty.
- **KBWEB-025:** Public pages and publicly served assets must not expose private registration records, proof documents, restricted identity materials or internal safety information, consistent with `WEB-005`.

## User flow or contract

### Public discovery journey

1. A visitor arrives on `karlbruder.com` from search or a social link. Without a saved preference, the site presents the dark identity and a minimal brand header.
2. On a wide viewport, the hero splits an introduction/CTA from real Karlbrüder imagery; on a narrow viewport these areas stack cleanly.
3. The visitor can distinguish historical and Olympic fencing as activities of the same Karlbrüder community, and can use the primary path to find classes/participation details.
4. Additional sections show members training, competing and socializing. The page may alternate large editorial photographs, mosaics and occasional legible photo/text overlays.
5. Historical/heraldic elements support the experience through discreet dividers or editorial imagery, rather than dominating every section.
6. If the visitor opens a public tournament page, the event can have its own look while KB affiliation and navigation remain understandable.
7. A registration action transfers the visitor to the application origin and route already specified by `WEB-003`. The public site never collects account credentials, payment proof or personal registration records.
8. The visitor can choose light/dark presentation; their preference is shared with the application as described by `KBWD`.

### Homepage: medium-fidelity layout contract

The following **structural reference** is approved as direction, not as pixel-precise final composition:

| Sequence | Content purpose | Visual behavior | Delivery constraint |
| --- | --- | --- | --- |
| Header | Brand, main navigation, theme | Minimal logo-left navigation-right | Navigation entries/URLs follow owning `WEB` spec |
| Hero | Identify group and offer classes CTA | Split text + real photograph on desktop; stacked on mobile | Text must remain readable; no required autoplay hero video |
| Modality introduction | Make historical/Olympic fencing understandable | Simple contrasting editorial sections/cards | No unapproved final copy or invented modality details |
| Community in action | Demonstrate shared lived experience | Mix photo mosaics and larger photo-led sections | Authorized photos; no false stock portrayal |
| Classes/nuclei | Make participation information discoverable | One cohesive classes presentation, responsive layout | Actual locations/times require owner-provided data |
| History/heraldry preview | Provide historical depth without overwhelming homepage | Optional brief teaser and selected decorative detail | Do not make a large heraldry module mandatory |
| Event/social path | Connect visitor to relevant activities/socials | Clear event affiliation and appropriate CTA | Respect `WEB-002`–`WEB-004` |

The order beyond the hero and discoverability of classes may be adjusted during high-fidelity design review. The table does not authorize additional routes, content claims or backend features.

### Styling responsibilities

- `KBWD` owns palette, semantic colors, cross-subdomain theme preference, fonts, imagery and accessibility constraints.
- `KBUI` owns shared controls, angular geometry, component states, responsive header conventions and reusable typography roles.
- `KBWEB` owns the **public editorial composition and discovery experience**.
- `WEB` continues to own URLs, site/application handoff, event facts and public-site data boundaries.

## Acceptance criteria

- **KBWEB-AC-001:** Given a visitor opening the public homepage without stored theme preference, when the page renders, then it displays the Karlbrüder dark presentation, the real brand mark and a visible means of switching theme.
- **KBWEB-AC-002:** Given a wide desktop viewport, when the homepage hero renders, then a clear introduction and classes action occupy a region distinct from a large authentic KB photograph.
- **KBWEB-AC-003:** Given a phone or narrow side-by-side viewport, when the hero renders, then its content stacks or reflows with legible copy and reachable primary action, without page-level horizontal overflow.
- **KBWEB-AC-004:** Given a visitor unfamiliar with fencing, when scanning the first public sections, then both historical and Olympic fencing can be identified as activities offered by the same group.
- **KBWEB-AC-005:** Given a homepage community section, when reviewing its final images, then they show actual KB activity across training/competition/conviviality rather than generic substitute photography presented as documentary content.
- **KBWEB-AC-006:** Given a section with text placed over a photograph, when viewed across supported widths and both themes, then the text and any essential link/button remain readable and accessible.
- **KBWEB-AC-007:** Given the public header on desktop, when reviewed, then it presents the logo on the left and concise navigation/theme control on the right, without ornamental clutter.
- **KBWEB-AC-008:** Given narrow navigation, when using keyboard or touch, then the menu and theme control remain reachable, labeled and usable.
- **KBWEB-AC-009:** Given the classes experience, when comparing different localities, then the visitor can find the available city/nucleus information in a unified presentation rather than needing a separately invented route for each.
- **KBWEB-AC-010:** Given a large ultrawide viewport, when content is displayed, then paragraphs and interactive areas maintain bounded reading widths and photographs can take advantage of the available space without distorting.
- **KBWEB-AC-011:** Given manuscript imagery or an ornamented section, when the user reads or navigates, then ornament remains contextual and does not impair content contrast or interactive behavior.
- **KBWEB-AC-012:** Given a user with reduced motion enabled, when scrolling the homepage, then decorative transitions are reduced or eliminated without hiding any information.
- **KBWEB-AC-013:** Given a public Monomachia/event page, when viewing event imagery and registration actions, then the event may have distinctive branding while navigation and actions stay accessible and recognizably associated with KB.
- **KBWEB-AC-014:** Given a public event registration CTA, when activated in a production deployment, then it opens the environment-correct application registration flow governed by `WEB-003`, rather than a new public-site enrollment form.
- **KBWEB-AC-015:** Given an event page with configuration values not yet supplied, when rendered for review, then unknown details are identified appropriately and example venue, price and capacity values are not represented as confirmed facts.
- **KBWEB-AC-016:** Given a production public asset bundle, when examined, then the internal manual, consent records, proof documents and other restricted assets are not publicly exposed.
- **KBWEB-AC-017:** Given a medium-fidelity homepage wireframe approved for refinement, when a high-fidelity reference is built, then it preserves the agreed composition and content hierarchy; any behavioral changes are returned to the owning spec rather than silently approved through design.

## Implementation baseline

Reviewed **2026-11-04** from supplied source documents and design-review files only; no running/deployed public-site UI was independently inspected.

- The supplied [public-site specification](../public-website/presentation-and-navigation.md), last updated 2026-11-01, defines a public landing, Monomachia information, link to the tournament application, and data/privacy boundaries (`WEB-001`–`WEB-005`). Its baseline reports `landing/src/App.js` routes for homepage and `/monomachia` as of 2026-10-17; this report is not a fresh audit of that file.
- The supplied application wireframes are **not** the public homepage design. Their shared-brand and handoff examples may inform continuity, but they do not approve homepage layout, routes or new functionality.
- Final homepage photography, exact copy, the actual current site component tree, font web usage rights and production breakpoints were not verified in the supplied evidence.

## Open questions

None blocking the present **visual/UX direction**. Actual content, schedules, social destinations, existing routes and event information must come from their existing editorial/product owners, not be invented in this spec.

## Implementation decisions

- Inspect `landing/` and its actual page/asset structure before restructuring or replacing components. Confirm the repository path of `presentation-and-navigation.md` and link to it rather than duplicating the domain rules.
- Start with **medium-fidelity** mobile and desktop homepage wireframes; evolve to **high-fidelity** references after evaluating photographic assets, typography and accessible contrast. Do not treat mockup text or synthetic imagery as release-ready content.
- Validate wide and narrow compositions, including split-screen browser use and ultrawide monitors. Keep the hero's primary action visible and make image overlays legible across crops.
- Use real, authorized photographic assets. Prefer a nonvideo fallback when media is unavailable. Avoid adding automatic large-motion backgrounds to the hero.
- Keep the shared theme preference as defined by `KBWD`, rather than creating a second incompatible preference mechanism in landing.
- Reuse approved `KBUI` controls; public-site event CTAs must preserve existing routing and environment logic from `WEB-003` and must not build a parallel registration flow.
- Audit all references to unconfigured event facts in the public site before release, consistent with `WEB-004` and privacy rule `WEB-005`.

## Related specifications

- [Web design foundations](web-design-foundations.md) (`KBWD`) — brand system, themes, imagery, type, accessibility.
- [Shared UI components](shared-ui-components.md) (`KBUI`) — header, buttons, cards, states and responsive controls.
- [Public website presentation and navigation](../public-website/presentation-and-navigation.md) (`WEB-001`–`WEB-005`) — **canonical** public site and application handoff.
- [Application wireframe review](app-wireframes/README.md) — reference for shared continuity and app flows, not a homepage wireframe.
- Karlbrüder Identity Manual — institutional source, restricted to authorized members/partners.
