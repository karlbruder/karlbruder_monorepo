# Karlbrüder application wireframes

**Created**: 2026-10-18
**Last updated**: 2026-11-26

| Field | Value |
| --- | --- |
| Status | Draft for product/design review, v0.1 |
| Application | `app.karlbruder.com` |
| Scope | Current account, registration and payment journeys, with proposed home and later-capability concepts |
| Language | Portuguese screen fixtures and review notes. The application header and staff navigation support Portuguese and English. Issue #21's Monomachia private registration route supports both languages. |
| Delivery | Offline HTML/CSS/JS artifact under specs; no frontend application changes |

[Open the interactive wireframes](index.html). Open `index.html` in a browser directly, or serve the repository root with `python3 -m http.server 8766 --bind 127.0.0.1` and visit `http://127.0.0.1:8766/specs/design/app-wireframes/`. The artifact uses existing assets from `landing/`, so keep it inside the repository.

The separate [conduction prototype](../tournament-conduction/README.md) demonstrates preparation, presence, Arena calls, bounds, discipline, official classification, seven qualification rounds, tie-breaks, final/publication and corrections for issue #91. It extends the staff workspace references below. WF-14 points to its detailed sporting consultation. The owning [conduction](../../tournaments/conduction.md) and [results](../../tournaments/results.md) specs govern the adopted behavior.

Use **Tela** to choose a screen by journey: home and account, tournament discovery, registration, staff operations, or other future concepts. The initial screen is the signed-in home. The selector numbers follow the journey order. Stable `WF-xx` identifiers in notes and `#WF-xx/state` links remain unchanged, so existing references still open their original screens. Use **Estado** to compare variants, **Celular** to preview a narrow layout, and **Notas da spec** to show source rules. Buttons connect the principal journeys and open illustrative decision dialogs. Browser print can export the current screen and notes.

The controls above the application frame and the spec notes are design-review tools, not proposed product UI. All displayed people, documents, amounts, counts, deadlines, and secondary events are fictional examples. Monomachia's name, longsword discipline, and supplied 17 January 2027 date come from its event spec; venue, final schedule, capacity, registration window, and Pix destination remain configuration inputs. Social is R$ 50, Plena is R$ 100, and Plus is R$ 200. The **Informações não configuradas** state shows unknown values instead of treating examples as final facts.

## Proposed registration offerings and athlete list

Review [creation with products](index.html#WF-12/productcreate), [no reusable products](index.html#WF-12/productempty), [loading](index.html#WF-12/productloading), [failed load](index.html#WF-12/productloaderror), [invalid fields](index.html#WF-12/productinvalid), [failed save](index.html#WF-12/producterror), [pending save](index.html#WF-12/productsaving), and [success](index.html#WF-12/productsaved). Existing products and new drafts are submitted with the tournament. Examples are fictional and the preview does not persist data.

For an existing tournament, compare [no offerings](index.html#WF-20/offerempty), [adding](index.html#WF-20/offeradd), [no search results](index.html#WF-20/offersearch), [editing details](index.html#WF-20/offeredit), [changing price](index.html#WF-20/offerprice), and [deactivation](index.html#WF-20/offerdeactivate). Each shared change names affected tournaments before confirmation. [Failure](index.html#WF-20/offererror), [pending](index.html#WF-20/offersaving), and [success](index.html#WF-20/offersaved) illustrate feedback. Historical registration terms remain unchanged. See [CAT-009 and CAT-010](../../tournaments/catalog.md#rules).

The participant can review an [unavailable option](index.html#WF-04/unavailable), [updated option](index.html#WF-04/stale) or [retry a failed refresh](index.html#WF-04/optionerror). Entered information and a selected consent file remain available. See [REG-019](../../tournaments/registration.md#rules).

The staff athlete list shows purchased product names and a tournament-wide summary. Compare [list](index.html#WF-26/list), [no registrations](index.html#WF-26/empty), [one search match](index.html#WF-26/matching), [no search matches](index.html#WF-26/filtered), [unlimited](index.html#WF-26/unlimited), and [zero capacity](index.html#WF-26/zero). A missing historical snapshot is unavailable. Total registrations include cancellations and do not change with search. Confirmed registrations are shown separately. See [ADM-013](../../tournaments/administration.md#rules).

## Proposed tournament document uploads

In [tournament settings](index.html#WF-12/edit), the document section follows tournament details and tags. Each registration policy has a row with its current file and an action that reveals the upload form. The controls are available after [creating the tournament](index.html#WF-12/create). Choose a sample local file to simulate publishing it.

Review [no documents](index.html#WF-12/policyempty), [upload in progress](index.html#WF-12/policyuploading), [failed replacement](index.html#WF-12/policyerror), and [successful replacement](index.html#WF-12/policysaved). The failed replacement keeps the current document visible and the other document's controls available. See [CAT-008/009](../../tournaments/catalog.md) and [issue #88](https://github.com/karlbruder/karlbruder_monorepo/issues/88).

[Additional documents](index.html#WF-12/policyadditional) have a separate list. Use **Adicionar documento** to enter a title and choose a sample file. The [athlete's tournament details](index.html#WF-02/athlete) and [registration form](index.html#WF-04/adult) link to available files. Registration puts tournament documents in a card after tags and before Safety and participation. The application uses the same document card on the existing signed-in tournament view. The standalone details screen remains a design proposal.

The athlete's document section uses fully clickable tiles with the file title, format, and new-tab icon. The tiles form a grid on desktop and stack at phone widths. Hide the section if there are no files to open. When the section is present, show “conteúdo ainda não disponível” for a missing rules document or cancellation policy. Compare [details without documents](index.html#WF-02/documentsmissing) and [registration with one policy missing](index.html#WF-04/documentspartial).

Append the short document name and a new-tab icon to each applicable declaration. The rules and cancellation links open the same file as the document card. The application privacy policy stays in the footer and is also linked from the data-processing declaration. The prototype opens an illustrative preview in a separate tab. See [registration display rules](../../tournaments/registration.md#tournament-documents-and-declarations) and [PRIV-AC-001](../../tournaments/consent-and-privacy.md#acceptance-criteria).

## Proposed tournament tags

Review [registration selection](index.html#WF-04/adult), [participant editing](index.html#WF-08/edit) and [the closed window](index.html#WF-08/tagsclosed), [tournament tag configuration](index.html#WF-12/edit), and [tournament detail](index.html#WF-20/detail) → [staff athlete list](index.html#WF-26/list) and [staff registration management](index.html#WF-25/review), including [editing tags](index.html#WF-25/add). These screens are a design proposal. They do not implement the feature or settle outstanding product decisions. The prototype uses fixed examples and does not persist changes.

The agreed rules allow zero tags and close athlete editing when staff close new
registrations early. Tag assignments stay in the authenticated application.
Changes do not require notifications or an audit history. Staff check eligibility
at the event. The notes in the prototype may still describe earlier proposals.

## Visual identity for the Monomachia review

This preview follows the guild's visual foundations and shared component guidance. It pairs the dark guild header with light forms, tables, and staff workspaces. The header and event cover use the original guild wordmark and Monomachia artwork. Square edges, thin borders, and a visible keyboard focus ring carry through the public, personal, and staff screens. The phone layout uses a collapsible menu. Dense tables scroll within their own regions. [Web design foundations](../web-design-foundations.md) · [Shared UI components](../shared-ui-components.md) · [Guild wordmark](../../../landing/public/logos/logo_white_with_name.png) · [Monomachia mark](../../../landing/public/monomachia/logo.svg)

**Temporary color exception.** For this Monomachia preview, retain wine `#642226` for established actions and accents, clay `#e19861` for dark-shell navigation accents, and cream `#f8e8cb` for the event cover. Keep the existing hybrid shell and status color roles, with contrast adjustments for text and control boundaries. The guild palette migration is deferred until after Monomachia (KBWD-003–006 and KBUI-002).

Use the appearance icon in the application header to choose **Claro**, **Escuro**, or **Sistema**. The icon shows the selected mode. Light is the default and uses the hybrid presentation. System follows the device appearance, including changes while the preview is open. The theme applies to the review interface and linked document previews. Open the globe menu to switch the application header and staff navigation between **Português** and **English**. Screen fixtures and review notes are in Portuguese. Both controls preserve the current screen, state, and in-progress inputs. The browser remembers both choices where local storage is available.

Signed-in screens use the same main navigation and account menu. Open the avatar to find **Alterar senha** and **Sair**. The avatar stays at the far right beside the appearance and language controls. The open menu shows the account name and email. The athlete fixture shows initials. Staff views show a fictional portrait to illustrate the profile-photo variant. Navigating with the header preserves the illustrated account, including on the password screen. Staff navigation remains available to the staff fixture.

| Typography role | Preview family and license |
| --- | --- |
| Display headings and featured card titles | Schwager W04 Black is the approved face. A licensed webfont was unavailable for this artifact. Roboto Slab Black is the bundled substitute. It retains a heavy slab silhouette with rounder letterforms and softer corners than Schwager. Line breaks can differ. [Schwager licensing](https://www.myfonts.com/products/black-schwager-127657/licenses) · [Roboto Slab license](fonts/roboto-slab-LICENSE.txt) |
| Event titles and historical headings | Grenze Gotisch, distributed under the SIL Open Font License 1.1. [Upstream family](https://github.com/google/fonts/tree/main/ofl/grenzegotisch) · [License](fonts/grenze-gotisch-OFL.txt) |
| Forms, tables, actions, and feedback | Source Sans 3, distributed under the SIL Open Font License 1.1. [Upstream family](https://github.com/adobe-fonts/source-sans) · [License](fonts/source-sans-3-OFL.txt) |

The preview serves the Google Fonts Latin WOFF2 builds from its local `fonts/` directory. These builds include the Portuguese characters used in the review and require no remote requests.

Use the relevant screens as the visual baseline for authorized frontend work. Follow the latest [application vocabulary](../../taxonomy.md#application-vocabulary). Product specs govern behavior and delivery scope. Illustrative controls, future screens, and fictional values do not authorize new functionality or configuration.

## Screen-to-spec map

`WF-xx` identifies a design screen, not a new product rule. The interactive notes cite rules on every screen. Banners identify implemented portions and proposals. Even where a journey is partly implemented, the presentation and individual states are illustrative, not an exact reproduction. The current application has no catalog or cross-tournament personal list. The selected tournament registration page restores the person’s active registration, or a named owned registration from a link. [Issue #63](https://github.com/karlbruder/karlbruder_monorepo/issues/63) tracks the proposed personal list.

| Screen | Audience / delivery | Source and important states |
| --- | --- | --- |
| [WF-17 · Signed-in home](index.html#WF-17/current) | Existing actions in a proposed layout and future home | [AUTH-002/008](../../identity/authentication-and-access.md), [REG-008](../../tournaments/registration.md). Current account shortcuts and proposed registration list, empty, loading, error and admin states. |
| [WF-01 · Catalog](index.html#WF-01/public) | Visitor/member · proposed | [CAT-001, 004, 005](../../tournaments/catalog.md): public, member-only additions, empty and load failure. CAT-AC-001/005. |
| [WF-02 · Event details](index.html#WF-02/open) | Visitor · proposed | [CAT-002–004](../../tournaments/catalog.md), [CAP-008](../../tournaments/capacity-and-waitlist.md): open, full-but-open, closed, unknown configuration. CAT-AC-004/008. |
| [WF-03 · Account access](index.html#WF-03/login) | Visitor · first release | [AUTH-001–003/006](../../identity/authentication-and-access.md): sign-in, sign-up, verification, recovery, new password, signed-in password change (`changepassword`), expired session, unavailable service. Routes `/account/sign-in` through `/account/password`. AUTH-AC-002/003. |
| [WF-04 · Self-registration](index.html#WF-04/adult) | Participant · first release | [REG-001–005/010/011/015/019](../../tournaments/registration.md), [PRIV-001/002/010](../../tournaments/consent-and-privacy.md): product choice, adult, minor, full event, validation error, duplicate, closure during entry. REG-AC-001/003/007/010/015. |
| [WF-05 · Pix and proof](index.html#WF-05/initial) | Participant · first release | [PAY-001/003/004/006/010/011](../../tournaments/payments-and-confirmation.md): first upload, replacement, rejection/resubmission, invalid file, late payment. PAY-AC-001/003/006/010/012. |
| [WF-06 · Registration status](index.html#WF-06/review) | Participant · first release | [REG-006/007](../../tournaments/registration.md), [CAP-002/005/007](../../tournaments/capacity-and-waitlist.md): reviewing, confirmed, waitlist. REG-AC-011, PAY-AC-007. |
| [WF-07 · My registrations](index.html#WF-07/list) | Participant · proposed (#63) | [REG-007/008](../../tournaments/registration.md), [AUTH-009](../../identity/authentication-and-access.md): personal list and empty state. REG-AC-005. |
| [WF-24 · My tags](index.html#WF-24/edit) | Participant · proposed | [REG-005/008](../../tournaments/registration.md): editable selection, closed window, save feedback, and a tournament with no tags. |
| [WF-26 · Tournament athletes](index.html#WF-26/list) | Staff · proposed | [ADM-001/002/013](../../tournaments/administration.md): historical offering, total registrations, confirmed count, capacity, empty and filtered states, and a link to registration management. |
| [WF-25 · Manage registration](index.html#WF-25/review) | Staff · registration corrections and tags | [ADM-003/012](../../tournaments/administration.md): correct registration details and manage tags together, with separate saves. |
| [WF-08 · Edit my registration](index.html#WF-08/edit) | Participant · proposed | [PRIV-005](../../tournaments/consent-and-privacy.md): allowed fields and duplicate conflict; declarations are read-only with contact and privacy links. PRIV-AC-007, REG-AC-017. |
| [WF-18 · Guild panel](index.html#WF-18/overview) | Admin · proposed | [AUTH-008](../../identity/authentication-and-access.md), [ADM-001](../../tournaments/administration.md). Shared navigation, loading, error and access restriction. [#75](https://github.com/karlbruder/karlbruder_monorepo/issues/75). |
| [WF-19 · Tournament list](index.html#WF-19/list) | Admin · proposed | List, empty, loading, error and restriction. [#75](https://github.com/karlbruder/karlbruder_monorepo/issues/75). |
| [WF-20 · Tournament detail and deletion](index.html#WF-20/detail) | Admin · proposed | Confirmation, success and rejection when registrations exist, including after closure. Future match results also prevent deletion. [#75](https://github.com/karlbruder/karlbruder_monorepo/issues/75). |
| [WF-21 · Users](index.html#WF-21/list) | Admin · proposed | List, filter, empty, loading, error and restriction. [#74](https://github.com/karlbruder/karlbruder_monorepo/issues/74). |
| [WF-22 · Change role](index.html#WF-22/choose) | Admin · proposed | Three roles, feedback, self-demotion and last-admin scenarios. [#74](https://github.com/karlbruder/karlbruder_monorepo/issues/74). |
| [WF-09 · Review queue](index.html#WF-09/queue) | Staff · first release | [ADM-001/002/004](../../tournaments/administration.md): pending proofs, empty queue, loading, failure and restricted access. ADM-AC-002/006. |
| [WF-10 · Payment decision](index.html#WF-10/available) | Staff · first release | [PAY-004/005/011/013](../../tournaments/payments-and-confirmation.md), [CAP-003](../../tournaments/capacity-and-waitlist.md): available/full, rejection reason, late Pix, minor evidence, changed capacity or evidence, loading, access failure and notification failure. PAY-AC-005/007/011/012, ADM-AC-003/004. |
| [WF-11 · Waitlist selection](index.html#WF-11/seat) | Staff · later operations interface | [CAP-003/005/009](../../tournaments/capacity-and-waitlist.md): staff selection with/without capacity, no payment reapproval. CAP-AC-004/009. |
| [WF-12 · Tournament settings](index.html#WF-12/edit) | Staff · tournament administration | [CAT-008/009](../../tournaments/catalog.md), [CAP-009](../../tournaments/capacity-and-waitlist.md). Covers creation, editing, independent document uploads and replacement, registration closure, refund eligibility, and rejected capacity reduction. CAT-AC-007, CAP-AC-007/008. |
| [WF-13 · Cancellation/refund](index.html#WF-13/confirm) | Participant confirmation and refund status, staff queue and transfer recording | [REG-013/016](../../tournaments/registration.md), [PAY-009/012](../../tournaments/payments-and-confirmation.md): unpaid, paid cancellation, refund pending/completed, staff recording. PAY-AC-008/009/013. |
| [WF-14 · Results/directory](index.html#WF-14/unavailable) | Audience constrained by event · prototype | [RES-001/003/004/008](../../tournaments/results.md), [PRIV-006](../../tournaments/consent-and-privacy.md): unavailable/published entry to detailed conduction consultation, limited authenticated directory, restricted internal event. RES-AC-002/003/004/008, PRIV-AC-003/004. |
| [WF-15 · Association](index.html#WF-15/concept) | Member · future concept | [MEM-001–004/006](../../membership/overview.md): reserves space for own membership and dues without inventing financial policy. MEM-AC-001/004. |
| [WF-16 · Inventory](index.html#WF-16/list) | Staff only · future concept | [INV-001/003–007](../../inventory/overview.md): list/edit/retire, aggregate quantity and descriptive condition. INV-AC-001/003/004/005. |

Navigation and layout in the artifact are proposals. Every screen carries a banner identifying a existing actions in a proposed layout, a partly implemented journey, or a proposed concept. Links between screens simulate review journeys and are not evidence of application navigation. The UI route `/tournaments/registration` is established by REG-001; `#WF-xx/state` links are artifact anchors, not proposed production routes. Other route names and menu organization remain implementation/design choices.

The current home links to password change, Monomachia registration, sign-out and, for admins, payment review. Compare [current home](index.html#WF-17/current) with the proposed [populated](index.html#WF-17/list), [empty](index.html#WF-17/empty), [loading](index.html#WF-17/loading), [error](index.html#WF-17/error) and [admin](index.html#WF-17/admin) states. The proposed admin panel is planned in [#75](https://github.com/karlbruder/karlbruder_monorepo/issues/75).

## Home design rationale

The proposed home puts the registration first. Its card combines the event, status, and next step. Account and admin destinations use compact navigation lists with descriptive labels. The current-home states show a proposed layout for the existing application actions. They do not reproduce the current layout. The empty, loading, and error states do not imply that the proposed cross-tournament list is already available.

This is a design judgment informed by the Scottish Government’s [2025 card navigation guidance](https://designsystem.gov.scot/patterns/navigational-pages/card-navigation), which recommends cards for browsing and notes their space cost, and [dashboard text research published in 2025](https://doi.org/10.1109/TVCG.2024.3456601), which describes the role of text in context and navigation. These sources do not validate this particular design with Karlbrüder users. The same approach is used for the proposed personal registration list and the payment-review queue. Forms keep their fields and action buttons, while operational tables retain their columns for comparison. Tournament details and account access retain their existing structures. Keyboard focus and phone layout need interactive review.

The guild panel is a proposal. Follow [panel](index.html#WF-18/overview) → [tournaments](index.html#WF-19/list) → [detail](index.html#WF-20/detail) → [configuration](index.html#WF-12/edit) or [deletion](index.html#WF-20/confirm). Compare deletion [rejection after closure](index.html#WF-20/closed) with [success](index.html#WF-20/deleted). Use [create](index.html#WF-12/create) for unconfigured inputs and [policy failure](index.html#WF-12/policyerror) for rollback. Review [payments](index.html#WF-09/queue) and [users](index.html#WF-21/list) from the same navigation. The role selector illustrates [self-demotion](index.html#WF-22/self), [last-admin demotion](index.html#WF-22/last), success and failure.

Issue [#75](https://github.com/karlbruder/karlbruder_monorepo/issues/75) defers tournament-change notifications although CAT-008 and ADM-010 currently describe them. The artifact follows that issue decision and does not claim the specifications have already changed. [#62](https://github.com/karlbruder/karlbruder_monorepo/issues/62) supplies the configuration workflow, with unknown values left unconfigured.

## Review the important journeys

1. **Visitor to payment review:** WF-01 → WF-02 → WF-03 → WF-04 → WF-05 → WF-06. The selected tournament survives the illustrated sign-in handoff. Successful registration produces an example registration number and no reserved seat. Authentication buttons and submission simulate navigation only.
2. **Full event:** WF-02/full → WF-04/full → WF-05 → WF-10/full → WF-06/waitlist. A warning precedes submission. Registration and file upload do not consume capacity; staff-approved payment can produce paid waiting status. Select alternate states in the toolbar to review these branches.
3. **Evidence rejected:** WF-10/reject → WF-05/rejected → WF-06/review. Require a reason, explain notification, show resubmission, and do not imply participation cancellation. The staff document history and participant's latest-only view stay distinct. WF-06 → WF-05/replace illustrates replacing existing evidence without requesting a second payment or inventing a participation-status transition.
4. **Minor:** WF-04/minor and WF-10/minor show the private scanned parental consent form. WF-06/confirmed retains the event-day obligation for accompaniment and in-person document checks. No extra identity-document upload is invented.
5. **Correction and concurrency:** WF-04/duplicate, WF-04/closed, WF-08/conflict, and WF-10/race show failures without claiming success. A displayed capacity count never replaces the backend transaction.
6. **Waitlist:** WF-11 confirms an eligible selected person only with an available seat. No queue position, automatic promotion, invitation expiration, or second approval of payment.
7. **Cancellation:** WF-13 illustrates a future refundable tournament. Monomachia uses the registration status view without the athlete cancellation control. WF-13 distinguishes cancelled participation from refund progress, releases capacity immediately, retains the received-amount/10-business-day rule, and offers no reopening control.
8. **Roles and future scope:** compare WF-01/public and member. Inspect WF-14 restricted access and the private-data-free directory. WF-15 does not equate tournament payments with dues. WF-16 has no loans, reservations, per-unit tracking, or member access.

## Decisions deliberately not made here

- [PRIV-Q1](../../tournaments/consent-and-privacy.md#open-questions): final policy/declaration wording. WF-04 discloses live coverage and the results audience before required acceptance. The illustrated text remains draft material.
- [PRIV-Q4](../../tournaments/consent-and-privacy.md#open-questions): correction/deletion requests beyond allowed self-service edits. No delete-account/data workflow is invented.
- [RES-Q4](../../tournaments/results.md#deferred-questions): external correction-notification recipients and channels remain deferred. RES-Q1–Q3 are resolved for the conduction MVP. The separate prototype demonstrates sporting results, accepted provisional bounds and distinct final publication.
- [MEM-Q1–Q5](../../membership/overview.md#deferred-questions): membership lifecycle, status vocabulary, fees, exemptions, periods, and payment handling. All financial/status slots remain explicitly undefined.
- [CAT-Q3, CAP-Q5, PAY-Q6, ADM-Q2](../../open-questions.md#deferred-questions): multi-discipline, category limits, payment gateway, and exports remain outside these concrete first-release flows.

These are existing question IDs, not additional questions or silent answers. Review layout and wording here; settle policy in the owning spec first.

## Using the wireframes in spec-driven delivery

Reference a screen and state in the delivery issue alongside its owning rules and acceptance criteria, for example `WF-05/rejected + PAY-004 + PAY-AC-012`. A wireframe is supporting evidence of the intended interaction, never a substitute for the spec. Add implementation/tests through the normal issue workflow only after the relevant slice is agreed.

Changes to behavior belong in the owning specification and all affected screens in the same review. Pure layout refinements can update these artifacts without inventing product rules. The editable sources are `index.html`, `wireframes.css`, `wireframes.js`, and [the document preview](document-preview.html). Review the interactive artifact for its current states and layouts.

## Prototype limits

This is a navigation and state-review artifact. It has no authentication, backend, real payment details, storage, API calls, email, or persistent data. File controls do not read/upload contents. Filters, checks, form validation, and administrative decisions are illustrative; submitting a screen can navigate with blank fields. Use the state selector for errors and alternate outcomes. Refresh resets local form edits. Security and capacity protections are requirements to implement and test, not mechanisms demonstrated by this prototype.

The payment-review journey reflects existing functionality. Tournament management and user access management are proposed designs. Messaging editors, exports, results publishing, gateway checkout, and detailed membership administration are not designed as ready-to-implement workflows here. PRIV-008 operational controls remain backend/platform requirements beyond these screens.

## Design verification

On 19 November 2026, Chromium rendered all 25 screens and 133 selectable states at 320, 390, 1440, and 1920 px. The preview stayed within the page width. Desktop and phone visual checks covered the catalog, event details, account access, registration, payments, personal dashboard, and staff workspaces. The checks included the newer tag and tournament document flows and representative empty, error, pending, and success states.

The review exercised the screen and state selectors, width and notes controls, keyboard focus and Escape dismissal for the phone menu and payment dialog, the registration-to-payment journey, and simulated document upload and preview. Chromium loaded the revised CSS and JavaScript, fonts, and logos over loopback and when opening the file directly. Local spec links and representative text, control, and focus contrast were checked. These checks cover the prototype only.

The dark-theme check repeated the 133-state layout sweep at all four widths. Rendered text contrast was sampled across every state in both themes. The header icon menus were checked open across all states in both languages at 320, 390, 768, 1030, 1440, and 1920 px. Keyboard selection, Escape dismissal, click-away dismissal, and mobile sign-in were exercised. Switching preserved the screen, selected state, and an edited registration field. Reload restored both preferences. System followed changes to the emulated device appearance, and document links opened previews in the selected theme.

Checked on 18 October 2026 against the specifications in this checkout: 16 screens and 57 states rendered at desktop (1500 px) and phone (390 px) widths, with no horizontal overflow, broken loaded images, or JavaScript runtime errors. The main registration-to-proof journey and staff decision dialog were exercised, local document links and cited rule IDs were checked, and the preview snapshots available at that time were visually inspected. These checks validate the design artifact only; they do not validate application behavior, accessibility conformance, or product acceptance criteria.

On 5 November 2026, source-level checks rendered 103 screen states and checked the 22-screen selector and README links. The reviewer inspected and approved the revised screens and states at desktop and phone widths. These checks do not establish accessibility or application behavior.

The 5 November 2026 frontend comparison covered the router and protected layout, home, account forms and recovery, tournament registration and proof upload, and the payment-review queue and decision panel. The application restores a registration within a selected tournament, collects the amount received during review, displays the staff safety note for reading, and reports when a decision was recorded but its email failed. The prototype remains an illustrative composition, not a pixel-for-pixel copy.
