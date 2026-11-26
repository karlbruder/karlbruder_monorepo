# Monomachia Karlbrüder 2027

**Created**: 2026-10-17
**Last updated**: 2026-11-26

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | First major event using the generic tournament platform |
| Applications | landing for public presentation; frontend and backend for tournament workflows |
| Sources | Product-owner overview; Monomachia source notes folded into this specification; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20), [#21](https://github.com/karlbruder/karlbruder_monorepo/issues/21), [#24](https://github.com/karlbruder/karlbruder_monorepo/issues/24) |

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

The table lists event configuration, not the full schema. `Tournament.is_registration_closed` and `RegistrationAcceptance` already support staff closure and versioned acceptance evidence. Monomachia omits the athlete cancellation control under [ADR 0011](../../decisions/0011-tournament-refund-eligibility.md).

## Registration options

Monomachia offers three registration products. The selection is part of the
registration and follows [REG-019](../registration.md#rules). Participation and
capacity rules are the same for all three options.

| Option | Price | Included benefits |
| --- | --- | --- |
| Social Registration | R$ 50 | Participation and a trophy if the athlete wins one. No other winner prizes or sponsor coupons and giveaways. |
| Full Registration | R$ 100 | Participation, winner prizes, and participation in the distribution of sponsor coupons and giveaways. |
| Plus Registration | R$ 200 | All Full Registration benefits and a welcome and participation package, including a shirt, gifts, and breakfast. The complete package is not yet defined. |

Social is intended as a lower-cost option that contributes to the event's costs.
The product description identifies the benefits of each option. This specification
does not define a separate perk inventory or fulfillment workflow.

## Open questions

The full Plus package contents are not yet provided. Shared unresolved policies remain in the [question index](../../open-questions.md). Results and export details remain deferred in their owning specifications.

## Acceptance criteria

- **MONO-AC-001:** The public event page presents confirmed event facts and directs registration into the application.
- **MONO-AC-002:** A signed-in user registers for Monomachia through the same domain capabilities used by another configured tournament.
- **MONO-AC-003:** Submission produces a registration number and the correct non-confirmed initial status.
- **MONO-AC-004:** Event-specific eligibility and terms use the final configured versions and preserve acceptance evidence.

## Source conflicts and baseline

Issue #21 originally placed the form in `landing/`. [Decision 0001](../../decisions/0001-public-website-and-application.md) supersedes that placement. Issue #24's visual direction remains relevant, but its form-submission references must follow the application boundary.

The broader source requirements include more administration, exports, communications, and privacy work than #20/#21. Their presence here does not mean those features are implemented. The inspected landing page is a presentation and Instagram entry point.

## Related specifications

[Catalog](../catalog.md), [registration](../registration.md), [payments](../payments-and-confirmation.md), [capacity](../capacity-and-waitlist.md), [administration](../administration.md), [results](../results.md), [privacy](../consent-and-privacy.md), [communications](../communications.md).
