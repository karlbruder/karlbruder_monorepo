# Monomachia Karlbrüder 2027

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | First major event using the generic tournament platform |
| Applications | landing for public presentation; frontend and backend for tournament workflows |
| Sources | Product-owner overview; [Monomachia source requirements](../../../monomachia-requirements.md); [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20), [#21](https://github.com/karlbruder/karlbruder_monorepo/issues/21), [#24](https://github.com/karlbruder/karlbruder_monorepo/issues/24) |

## Event facts from the source

| Fact | Value or status |
| --- | --- |
| Name | Monomachia Karlbrüder 2027 |
| Event date | Sunday, 17 January 2027, as supplied in the source requirements; final schedule not confirmed here |
| Modality | Longsword (`longsword` in the initial tournament model) |
| Internal event | `false` in issue #20's initial setup example |
| Instagram | [monomachia.karlbruder](https://www.instagram.com/monomachia.karlbruder) |
| Public presentation | Existing `/monomachia` page in `landing/` |
| Registration | Authenticated application flow under the latest product direction |
| Application entry | `app.karlbruder.com/tournaments/registration` from `karlbruder.com.br` or event links |
| Registration date convention | Opening day through closing day, inclusive, GMT-3 (UTC-03:00) |
| Seat assignment | Staff confirmation occupies a seat, during payment approval or later selection from the paid waitlist; registration/proof review does not |

## Rules

- **MONO-001:** Public presentation uses Monomachia visual identity and keeps event information and the application entry point readable on phone and desktop.
- **MONO-002:** The event uses shared tournament registration, payment review, capacity, privacy, communications, and results capabilities. Its configuration and branding must not create a second backend.
- **MONO-003:** Event facts include fee, registration deadline, capacity, regulation, mandatory equipment, cancellation/refund policy, location/schedule, and prizes/categories once confirmed. Unknown facts remain unconfirmed rather than receiving invented defaults.
- **MONO-004:** Beginner/special-category eligibility is confirmed by guild staff (admins) against the final regulation. A participant's self-selection is not sufficient.
- **MONO-005:** Required declarations and versioned regulation acceptance follow the shared consent specification. Image authorization remains a separate choice.

## Tournament configuration

Event values are staff-managed Tournament configuration, not product questions. Use the generic resource supplied by the owner:

| Configuration | Tournament fields or policy |
| --- | --- |
| Identity and description | `id`, `name`, `description`, `modality`, `is_internal` |
| Event dates | `starts_at`, `ends_at` |
| Registration window | `registration_opens_at`, `registration_closes_at`; inclusive GMT-3 calendar days |
| Payment deadline and fee | `payment_due_at`, `inscription_fee_amount`; currency is always BRL |
| Capacity | `max_competitor_capacity`; null means unlimited; no waitlist-size limit |
| Venue and schedule | `location`, `schedule` |
| Regulation | `regulation`, supplied as text or URL; retain versioned acceptance evidence |
| Equipment and cancellation | `equipment_requirements`, `cancellation_policy` (text or URL) |
| Record creation | `created_at` |
| Pix destination | Receiving account and Pix key are payment configuration, not fixed product-spec values |

No concrete fee, Pix destination, registration dates, capacity, venue, schedule, or final regulation is asserted here. Populate these values for event rollout; do not block generic platform design on them. Eligibility, minimum age, and any prizes/category criteria belong in the configured event regulation rather than hardcoded Monomachia logic. This does not introduce automated category eligibility beyond the shared staff-review rules.

The supplied model is a starting domain shape. Staff closure of new registrations and versioned acceptance evidence may require supporting fields or records chosen during implementation; do not assume the listed fields already implement every agreed workflow.

## Open questions

None specific to Monomachia product behavior. Shared unresolved policies remain in the [question index](../../open-questions.md). Results and export details remain deferred in their owning specifications.

## Acceptance criteria

- **MONO-AC-001:** The public event page presents confirmed event facts and directs registration into the application.
- **MONO-AC-002:** A signed-in user registers for Monomachia through the same domain capabilities used by another configured tournament.
- **MONO-AC-003:** Submission produces an inscription number and the correct non-confirmed initial status.
- **MONO-AC-004:** Event-specific eligibility and terms use the final configured versions and preserve acceptance evidence.

## Source conflicts and baseline

Issue #21 originally placed the form in `landing/`. [Decision 0001](../../decisions/0001-public-website-and-application.md) supersedes that placement. Issue #24's visual direction remains relevant, but its form-submission references must follow the application boundary.

The broader source requirements include more administration, exports, communications, and privacy work than #20/#21. Their presence here does not mean those features are implemented. The inspected landing page is a presentation and Instagram entry point.

## Related specifications

[Catalog](../catalog.md), [registration](../registration.md), [payments](../payments-and-confirmation.md), [capacity](../capacity-and-waitlist.md), [administration](../administration.md), [results](../results.md), [privacy](../consent-and-privacy.md), [communications](../communications.md).
