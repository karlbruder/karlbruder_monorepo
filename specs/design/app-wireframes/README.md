# Karlbrüder application wireframes

| Field | Value |
| --- | --- |
| Status | Draft for product/design review, v0.1 |
| Application | `app.karlbruder.com` |
| Scope | Initial registration/payment journey, with separate later-capability concepts |
| Language | Wireframes show Portuguese; issue #21's Monomachia private registration route supports Portuguese and English interface copy |
| Delivery | Offline HTML/CSS/JS artifact under specs; no frontend application changes |

[Open the interactive wireframes](index.html). Open `index.html` in a browser directly, or serve the repository root with `python3 -m http.server 8766 --bind 127.0.0.1` and visit `http://127.0.0.1:8766/specs/design/app-wireframes/`. The artifact uses existing assets from `landing/`, so keep it inside the repository.

Use **Tela** to choose a screen, **Estado** to compare variants, **Celular** to preview a narrow layout, and **Notas da spec** to show source rules. Buttons connect the principal journeys and open illustrative decision dialogs. Browser print can export the current screen and notes.

The controls above the application frame and the spec notes are design-review tools, not proposed product UI. All displayed people, documents, amounts, counts, deadlines, and secondary events are fictional examples. Monomachia's name, longsword modality, and supplied 17 January 2027 date come from its event spec; venue, final schedule, fees, capacity, registration window, and Pix destination remain configuration inputs. The **Informações não configuradas** state shows unknown values instead of treating examples as final facts.

## Visual identity from the landing site

| Evidence in the repository | Application interpretation |
| --- | --- |
| [Guild logo](../../../landing/public/logos/logo_white_with_name.png), used by [Header](../../../landing/src/components/Header.js) | Reuse the original white sword/shield and Karlbrüder wordmark in a charcoal application header. Do not redraw or replace the mark. |
| [About](../../../landing/src/components/About.js), [Training](../../../landing/src/components/Training.js), [Footer](../../../landing/src/components/Footer.js) | Carry forward the dark guild framing and clear white typography. Use light content surfaces for long forms and administrative reading. |
| [Monomachia styles](../../../landing/src/pages/MonomachiaPage.css) and [banner styles](../../../landing/src/components/Banner.css) | Preserve wine `#642226`, clay `#e19861`, cream `#f8e8cb`, and restrained serif event headings within Monomachia presentation. These are event cues, not a mandate to theme every future event identically. |
| [Landing typography](../../../landing/src/index.css) and Monomachia's Georgia headings | System sans-serif for forms, labels, and tables; Georgia for event/editorial headings. No remote font requests. |

The shared shell is guild-branded. Monomachia remains one event in a reusable catalog. The lighter workspace, spacing, navigation, components, microcopy, and responsive breakpoints are proposed design choices, not new product requirements. State labels include words rather than relying on color alone.

## Screen-to-spec map

`WF-xx` identifies a design screen, not a new product rule. The interactive notes cite rules on every screen. First-release coverage below concerns layout and state communication; it is not evidence of implementation or passing acceptance tests.

| Screen | Audience / delivery | Source and important states |
| --- | --- | --- |
| [WF-01 · Catalog](index.html#WF-01/public) | Visitor/member · first release | [CAT-001, 004, 005](../../tournaments/catalog.md): public, member-only additions, empty and load failure. CAT-AC-001/005. |
| [WF-02 · Event details](index.html#WF-02/open) | Visitor · first release | [CAT-002–004](../../tournaments/catalog.md), [CAP-008](../../tournaments/capacity-and-waitlist.md): open, full-but-open, closed, unknown configuration. CAT-AC-004/008. |
| [WF-03 · Account access](index.html#WF-03/login) | Visitor · first release | [AUTH-001–003/006](../../identity/authentication-and-access.md): sign-in, sign-up, verification, recovery, new password, expired session, unavailable service. AUTH-AC-002/003. |
| [WF-04 · Self-registration](index.html#WF-04/adult) | Participant · first release | [REG-001–005/010/011/015](../../tournaments/registration.md), [PRIV-001/002/010](../../tournaments/consent-and-privacy.md): adult, minor, full event, validation error, duplicate, closure during entry. REG-AC-001/003/007/010/015. |
| [WF-05 · Pix and proof](index.html#WF-05/initial) | Participant · first release | [PAY-001/003/004/006/010/011](../../tournaments/payments-and-confirmation.md): first upload, replacement, rejection/resubmission, invalid file, late payment. PAY-AC-001/003/006/010/012. |
| [WF-06 · Registration status](index.html#WF-06/review) | Participant · first release | [REG-006/007](../../tournaments/registration.md), [CAP-002/005/007](../../tournaments/capacity-and-waitlist.md): reviewing, confirmed, paid waitlist. REG-AC-011, PAY-AC-007. |
| [WF-07 · My registrations](index.html#WF-07/list) | Participant · first release | [REG-007/008](../../tournaments/registration.md), [AUTH-009](../../identity/authentication-and-access.md): personal list and empty state. REG-AC-005. |
| [WF-08 · Edit my registration](index.html#WF-08/edit) | Participant · first release | [PRIV-005](../../tournaments/consent-and-privacy.md): allowed fields and duplicate conflict; preserve acceptance history. PRIV-AC-007, REG-AC-017. |
| [WF-09 · Review queue](index.html#WF-09/queue) | Staff · first release | [ADM-001/002/004](../../tournaments/administration.md): pending proofs and empty queue. ADM-AC-002/006. |
| [WF-10 · Payment decision](index.html#WF-10/available) | Staff · first release | [PAY-004/005/011/013](../../tournaments/payments-and-confirmation.md), [CAP-003](../../tournaments/capacity-and-waitlist.md): available/full, rejection reason, late Pix, minor evidence, changed capacity. PAY-AC-005/007/011/012, ADM-AC-003/004. |
| [WF-11 · Paid waitlist selection](index.html#WF-11/seat) | Staff · later operations interface | [CAP-003/005/009](../../tournaments/capacity-and-waitlist.md): staff selection with/without capacity, no payment reapproval. CAP-AC-004/009. |
| [WF-12 · Tournament settings](index.html#WF-12/edit) | Staff · later full administration | [CAT-008/009](../../tournaments/catalog.md), [CAP-009](../../tournaments/capacity-and-waitlist.md): configuration, closure, rejected capacity reduction. CAT-AC-007, CAP-AC-007/008. |
| [WF-13 · Cancellation/refund](index.html#WF-13/confirm) | Participant/staff · later workflow | [REG-013/016](../../tournaments/registration.md), [PAY-009/012](../../tournaments/payments-and-confirmation.md): unpaid, paid cancellation, refund pending/completed, staff recording. PAY-AC-008/009/013. |
| [WF-14 · Results/directory](index.html#WF-14/unavailable) | Audience constrained by event · later concept | [RES-001/003/004](../../tournaments/results.md), [PRIV-006](../../tournaments/consent-and-privacy.md): unavailable/published container, limited authenticated directory, restricted internal event. RES-AC-002/003/004, PRIV-AC-003/004. |
| [WF-15 · Association](index.html#WF-15/concept) | Member · future concept | [MEM-001–004/006](../../membership/overview.md): reserves space for own membership and dues without inventing financial policy. MEM-AC-001/004. |
| [WF-16 · Inventory](index.html#WF-16/list) | Staff only · future concept | [INV-001/003–007](../../inventory/overview.md): list/edit/retire, aggregate quantity and descriptive condition. INV-AC-001/003/004/005. |

The application navigation does not advertise future capabilities in the first-release screens. Future screens are accessible only through the review selector and carry an explicit concept banner. The UI route `/tournaments/registration` is established by REG-001; `#WF-xx/state` links are artifact anchors, not proposed production routes. Other route names and menu organization remain implementation/design choices.

## Review the important journeys

1. **Visitor to payment review:** WF-01 → WF-02 → WF-03 → WF-04 → WF-05 → WF-06. The selected tournament survives the illustrated sign-in handoff. Successful signup produces an example inscription number and no reserved seat. Authentication buttons and submission simulate navigation only.
2. **Full event:** WF-02/full → WF-04/full → WF-05 → WF-10/full → WF-06/waitlist. A warning precedes submission. Registration and file upload do not consume capacity; staff-approved payment can produce paid waiting status. Select alternate states in the toolbar to review these branches.
3. **Evidence rejected:** WF-10/reject → WF-05/rejected → WF-06/review. Require a reason, explain notification, show resubmission, and do not imply participation cancellation. The staff document history and participant's latest-only view stay distinct. WF-06 → WF-05/replace illustrates replacing existing evidence without requesting a second payment or inventing a participation-status transition.
4. **Minor:** WF-04/minor and WF-10/minor show the private scanned parental term. WF-06/confirmed retains the event-day obligation for accompaniment and in-person document checks. No extra identity-document upload is invented.
5. **Correction and concurrency:** WF-04/duplicate, WF-04/closed, WF-08/conflict, and WF-10/race show failures without claiming success. A displayed capacity count never replaces the backend transaction.
6. **Paid waitlist:** WF-11 confirms an eligible selected person only with an available seat. No queue position, automatic promotion, invitation expiration, or second approval of payment.
7. **Cancellation:** WF-13 distinguishes cancelled participation from refund progress, releases capacity immediately, retains the received-amount/10-business-day rule, and offers no reopening control.
8. **Roles and future scope:** compare WF-01/public and member. Inspect WF-14 restricted access and the private-data-free directory. WF-15 does not equate tournament payments with dues. WF-16 has no loans, reservations, per-unit tracking, or member access.

## Decisions deliberately not made here

- [PRIV-Q1](../../tournaments/consent-and-privacy.md#open-questions): final policy/declaration wording. Choices are separate and image permission includes refusal; placeholders are not approved legal content and cannot ship as-is.
- [PRIV-Q4](../../tournaments/consent-and-privacy.md#open-questions): correction/deletion requests beyond allowed self-service edits. No delete-account/data workflow is invented.
- [RES-Q1–Q4](../../tournaments/results.md#deferred-questions): result format, entry/import, publication timing, and correction process. The published view is an unstructured reserved area, not an agreed ranking table.
- [MEM-Q1–Q5](../../membership/overview.md#deferred-questions): membership lifecycle, status vocabulary, fees, exemptions, periods, and payment handling. All financial/status slots remain explicitly undefined.
- [CAT-Q3, CAP-Q5, PAY-Q6, ADM-Q2](../../open-questions.md#deferred-questions): multi-modality, category limits, payment gateway, and exports remain outside these concrete first-release flows.

These are existing question IDs, not additional questions or silent answers. Review layout and wording here; settle policy in the owning spec first.

## Using the wireframes in spec-driven delivery

Reference a screen and state in the delivery issue alongside its owning rules and acceptance criteria, for example `WF-05/rejected + PAY-004 + PAY-AC-012`. A wireframe is supporting evidence of the intended interaction, never a substitute for the spec. Add implementation/tests through the normal issue workflow only after the relevant slice is agreed.

Changes to behavior belong in the owning specification and all affected screens in the same review. Pure layout refinements can update these artifacts without inventing product rules. The primary editable sources are `index.html`, `wireframes.css`, and `wireframes.js`; PNG previews are supporting snapshots and must be regenerated when their screens change.

## Preview snapshots

- [Desktop catalog](previews/catalog-desktop.png)
- [Staff payment review with full capacity](previews/staff-review-desktop.png)
- [Mobile proof rejection/resubmission](previews/payment-mobile.png)
- [Mobile paid-waitlist status](previews/waitlist-mobile.png)

## Prototype limits

This is a navigation and state-review artifact. It has no authentication, backend, real payment details, storage, API calls, email, or persistent data. File controls do not read/upload contents. Filters, checks, form validation, and administrative decisions are illustrative; submitting a screen can navigate with blank fields. Use the state selector for errors and alternate outcomes. Refresh resets local form edits. Security and capacity protections are requirements to implement and test, not mechanisms demonstrated by this prototype.

The first-release staff screen presents manual payment review; full CRUD, messaging editors, exports, results publishing, role administration, gateway checkout, and detailed membership administration are not designed as ready-to-implement workflows here. PRIV-008 operational controls remain backend/platform requirements beyond these screens.

## Design verification

Checked on 18 October 2026 against the specifications in this checkout: 16 screens and 57 states rendered at desktop (1500 px) and phone (390 px) widths, with no horizontal overflow, broken loaded images, or JavaScript runtime errors. The main registration-to-proof journey and staff decision dialog were exercised, local document links and cited rule IDs were checked, and the four preview snapshots were visually inspected. These checks validate the design artifact only; they do not validate application behavior, accessibility conformance, or product acceptance criteria.
