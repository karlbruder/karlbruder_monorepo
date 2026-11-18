# Tournament consent and privacy

**Created**: 2026-10-17
**Last updated**: 2026-11-17

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Every released tournament workflow handling participant data; detailed policies unresolved |
| Applications | frontend, backend, landing where public information is displayed |
| Sources | Monomachia source requirements, sections 2, 3, 9, 10, and 11; [#20](https://github.com/karlbruder/karlbruder_monorepo/issues/20) |

## Goal

Collect the necessary participant declarations, preserve their evidence, and restrict personal and sensitive information to its intended use.

## Rules

- **PRIV-001:** Require acceptance of the tournament rules. The rules state whether the organizer and its authorized providers will capture and transmit athletes’ image and voice live during matches and official ceremonies, and identify the official channels. Authorization for that live coverage is a condition of participation when specified in the rules. Replays, including automatic public archives, highlights, and advertising require specific authorization. New registrations have no separate image choice. Acknowledge the privacy information independently.
- **PRIV-002:** Required declarations cover truthful information, inherent HEMA risks, mandatory equipment, physical fitness, and awareness of cancellation, refund, and disqualification rules. Record truthful information independently. Require answers for emergency contact and participation declarations.
- **PRIV-003:** Record the acceptance time, choices, and the IP evidence requested by the source. Retain references to the uploaded policy versions shown at acceptance. The handling and retention of that evidence must be defined in the privacy policy.
- **PRIV-004:** Private fields include document number, date of birth, email, phone, emergency contacts, payment proofs, staff notes, and safety information. Public representations must use explicit permitted fields rather than exposing complete registration records.
- **PRIV-005:** Participants may retrieve and correct their own TournamentRegistration fields except `staff_safety_note`, `id`, `tournament_id`, `user_id`, `registration_number`, `created_at`, `updated_at`, and `registration_status`. Safety notes are staff-only and excluded from participant responses, public views, and routine exports. Participant edits still obey validation and uniqueness rules. Recorded declarations are read-only on the registration edit page. The page provides organizer contact and a privacy-policy link for questions and requests. A future reacceptance flow must preserve earlier acceptance evidence.
- **PRIV-006:** Remove `show_on_public_list` and its opt-out choice. A limited participant directory and published results are visible to other authorized platform users under the event's public/internal access boundary. Terms must explain who can see the directory and named results before registration. Published results can include the athlete’s display name, category, match outcomes, and placement. Directory fields remain limited to display name, school/team, city/country, and confirmation status; private registration records are not exposed. This does not make private contact, payment, or safety fields public or change internal-event restrictions. Existing permitted guest access to published non-internal results remains unchanged.
- **PRIV-007:** Proof files require validated type/size, restricted storage, and authorized retrieval. Sensitive records and proofs are not email attachments or files in public website directories.
- **PRIV-008:** Released data-handling flows require HTTPS, appropriate protection against automated submissions, controlled administrative access, backups, and defined correction/deletion and retention processes.
- **PRIV-009:** Collect only data required for the event's agreed purpose. Administratively editable forms and terms must not change the recorded choices of earlier acceptances. Retain earlier uploaded policy versions and their acceptance references.
- **PRIV-010:** Minors register themselves. Participation requires a signed parental consent form, scanned and uploaded through the platform, and parental accompaniment during the event. At the event, both the minor and parent present their identity documents for staff to verify both in person. The signed term states whether the category has live coverage and who can see the athlete’s name and results. Assess publication in the minor’s best interests. Store the scanned term privately with authorized staff access. This in-person check does not require additional identity-document uploads or copies.
- **PRIV-011:** The interim retention policy is indefinite for registrations, every submitted payment proof, safety information, and acceptance/IP evidence. Do not add automatic expiry or deletion under an invented period. A final retention schedule remains deferred for policy review; correction/deletion requests remain subject to PRIV-Q4.

## Tournament rule template

For events with official live coverage, identify the channels and results
audience before registration opens. Adapt the text to the event’s actual scope.

> A participação no torneio está condicionada à aceitação deste regulamento.
> Ao aceitá-lo, o atleta autoriza a organização a captar sua imagem e voz
> durante as lutas e cerimônias oficiais e a transmiti-las ao vivo pelos
> canais oficiais indicados na página do torneio. Reprises, melhores momentos
> e campanhas publicitárias exigem autorização específica.
>
> A plataforma publicará o nome de exibição do atleta, a categoria, os
> resultados das lutas e a classificação. A página do torneio informará,
> antes da inscrição, quem poderá consultar esses resultados.
>
> Para atletas menores de idade, o termo assinado pelo responsável legal
> informará se a categoria terá transmissão ao vivo e quem poderá consultar
> o nome e os resultados do atleta.
>
> O Aviso de Privacidade informa as finalidades do tratamento, os critérios
> de conservação dos dados e o canal para exercer os direitos previstos na LGPD.

## Acceptance evidence

RegistrationAcceptance records separate choices, language, verified user UUID, server time and source IP.
The initial acceptance is atomic with registration and any required parental document.
Acceptance records reference the uploaded policy versions displayed at registration.
Existing records retain null references. Athletes can open recorded versions alongside their read-only declarations.

The registration form uses server-provided draft declarations in the selected interface language.
Its submitted token must match the current policy versions, configured text and links, equipment requirements, and declarations.
On mismatch the athlete reviews the current content and confirms the choices again.
Personal fields are retained while required choices are cleared.

## Delivery boundary

Issue #21 deferred the full consent package to a later issue. PROD-011 defines the first-release scope for required declarations and data protections. The tournament owns the uploaded rules and cancellation policy. Legacy text and links remain available as fallback during the transition. Final legal wording remains open under PRIV-Q1. The interim retention policy is indefinite.

## Acceptance criteria

- **PRIV-AC-001:** Missing required acceptances prevent completion. Before submitting, athletes see the coverage scope, named results and their audience, plus a link to the privacy policy. No standalone image choice is required or recorded for new registrations.
- **PRIV-AC-002:** A completed registration retains the acceptance choices, language, time, identity and IP evidence, plus references to the uploaded policy versions shown to the athlete.
- **PRIV-AC-003:** Public APIs, participant lists, event pages, and routine exports exclude restricted fields.
- **PRIV-AC-004:** Registration offers no participant-directory opt-out. Authorized platform users see the permitted directory projection, while restricted fields and internal-event boundaries remain protected.
- **PRIV-AC-005:** Unauthorized users cannot retrieve a proof or safety note through an identifier or storage link.
- **PRIV-AC-006:** A minor lacking either the signed parental consent form or parental accompaniment is not permitted to participate, under the agreed evidence-verification process.
- **PRIV-AC-007:** A participant can retrieve and correct their permitted registration fields but cannot retrieve `staff_safety_note` or modify staff/system-managed fields. Invalid edits cannot bypass uniqueness or overwrite earlier acceptance evidence.
- **PRIV-AC-008:** A minor can upload the scanned parental consent form privately through the platform; unauthorized users cannot retrieve it.
- **PRIV-AC-009:** No automatic retention job expires covered records or earlier proof submissions under the interim indefinite policy.
- **PRIV-AC-010:** At event check-in, staff verifies the minor's and accompanying parent's presented identity documents. Uploading the signed term alone does not replace the in-person check or accompaniment requirement.

## Open questions

- **PRIV-Q1:** Who supplies the approved event rules, official coverage channels, youth coverage and result visibility, and final declaration and privacy wording? Confirm the legal basis for each processing purpose before release, including mandatory live coverage and named results. Rules acceptance records participation terms. The privacy acknowledgment records receipt of information.
- **PRIV-Q4:** If a participant asks staff to delete their registration data or payment proofs, how should they submit that request, and what should staff delete versus keep? For example, should a completed event's registration be deleted, anonymized, or retained with its payment history? Participants already may edit their allowed fields themselves; this asks how staff handles requests beyond that access. Define retention criteria per purpose and record type. Account closure and published-result removal require independent decisions. The interim storage behavior remains in effect until a schedule and controlled purge are implemented.


## Related specifications

[Registration](registration.md), [payments](payments-and-confirmation.md), [administration](administration.md), [results](results.md), [communications](communications.md), [deployment](../platform/deployment.md).
