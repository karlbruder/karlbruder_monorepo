# Open-question index

There are **2 current-scope question entries** and **14 deferred question entries**. Each entry is defined once, in its owning specification, with a stable ID. Answer it there or refer to the ID in chat. This index links to the questions without duplicating them.

The counts refer to numbered entries, not individual question marks or subchoices. Current scope means relevant to the tournament/public-website product; an entry blocks only work that depends on its answer. Deferred entries apply to later capabilities and do not block the first registration/proof-review release.

## Current-scope questions

| Owning specification | IDs | Count |
| --- | --- | --- |
| [Consent and privacy](tournaments/consent-and-privacy.md#open-questions) | PRIV-Q1, PRIV-Q4 | 2 |
| **Total** | | **2** |

The remaining decisions are final declarations/privacy/image-use content and staff handling of correction/deletion requests beyond participant self-service edits. Each owning question includes concrete examples. Exact message copy is staff-maintained content, not a separate product-policy question.

Tournament fee, Pix destination, dates, venue, equipment, regulation, and eligibility are [event configuration](tournaments/events/monomachia-2027.md#tournament-configuration), not open product questions. No actual event values were invented. The former draft/published/archived catalog question introduced a lifecycle absent from the agreed resource; it is not a prerequisite for listing Tournament records.

## Deferred questions

| Owning specification | IDs | Count |
| --- | --- | --- |
| [Catalog extensions](tournaments/catalog.md#deferred-questions) | CAT-Q3 | 1 |
| [Category capacity](tournaments/capacity-and-waitlist.md#deferred-questions) | CAP-Q5 | 1 |
| [Payment gateway](tournaments/payments-and-confirmation.md#deferred-questions) | PAY-Q6 | 1 |
| [Exports](tournaments/administration.md#deferred-questions) | ADM-Q2 | 1 |
| [Results](tournaments/results.md#deferred-questions) | RES-Q1–RES-Q4 | 4 |
| [Messaging extensions](tournaments/communications.md#deferred-questions) | COM-Q3 | 1 |
| [Association membership](membership/overview.md#deferred-questions) | MEM-Q1–MEM-Q5 | 5 |
| **Total** | | **14** |

## Implementation and operations work

The cleanup did not resolve or discard remaining technical work. These topics are preserved outside the product-question count so developers can address them in implementation plans and delivery issues:

| Owner | Topics |
| --- | --- |
| [Identity](identity/authentication-and-access.md#implementation-decisions) | Callback/recovery paths, session handling, trusted role representation, response conventions |
| [Storage](platform/data-storage.md#implementation-and-operations-decisions) | S3/Ministack configuration and health-diagnostic exposure |
| [Deployment](platform/deployment.md#implementation-and-operations-decisions) | Verify live rollout state; workflow configuration; migrations, backups, recovery; Session Manager; DNS cutover |
| [Local development](platform/local-development.md#implementation-decisions) | Existing port/proxy/health-check alignment, test tooling, optional landing Compose integration |
| [AWS team access](platform/team-access.md#implementation-and-operations-decisions) | Verify deployed grants; onboarding/removal procedures; emergency access and automation credentials |
| [Communications](tournaments/communications.md#implementation-decisions) | SES SMTP configuration, delivery tracking, retries, duplicate-send handling |
| [Registration](tournaments/registration.md#implementation-decisions) | Inscription formatting, API naming, selected-tournament handoff, persistence details |
| [Capacity](tournaments/capacity-and-waitlist.md#implementation-decisions) | Persistence for staff closure of new registrations; authorized staff waitlist selection and transactional confirmation |
| [Inventory](inventory/overview.md#implementation-decisions) | Admin account mapping, field validation, archival/deletion representation |

Local SMTP setup is explicitly deferred, likely real SES with real AWS/SES credentials. That does not reopen the chosen production email service or require a local mail emulator.

## Decisions already settled

Do not re-ask about the three application roles, global admin access, self-registration, minor participation conditions, guest access to public tournaments, internal-event restrictions, public-results eligibility, application domains/registration route, or the initial release boundary.

The local/production stack split, Supabase UUID ownership, seat assignment only at staff approval, cancellation/refund progression, S3/Ministack storage, SES SMTP, and Cloudflare/EC2 TLS path are also established in the specs. Parental evidence is uploaded as a scanned signed term; at the event, staff verifies identity documents presented by both the minor and accompanying parent. Recording that verification is implementation work. Final policy wording and live deployment verification may still need work without making settled choices undecided again.

Late Pix transfers are a staff judgment: staff may accept them subject to ordinary capacity checks or decline participation and arrange a refund. Staff may explicitly increase capacity, but the system does not increase it or make late-payment judgments automatically.

Waitlist selection is also a staff judgment based on the event, participants, and capacity. The system imposes no queue priority, automatic promotion, mandatory invitation acceptance, or invitation expiry. Staff confirmation of a selected already-paid waitlisted participant checks and assigns available capacity without a second payment approval.

Pix-only payments in BRL, PDF/JPEG/PNG proofs up to 10 MB, staff access to proof history, refunds of the received amount within 10 business days, unlimited null capacity, an uncapped waitlist, staff closure of new registrations, and the ban on capacity reductions below confirmed participation are settled. Email uses Portuguese, the configured Suporte Karlbrüder sender, and the current account email. Participant-list opt-out is removed; limited directory/results visibility is disclosed in terms. Interim retention is indefinite pending a final policy review; that review is not an additional current question entry.
