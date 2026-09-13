# Backend TODOs

## TODO 1 - Protect and validate tournament signup input

### Context

`TournamentSignupCreate` currently performs structural validation only, such as
required fields, string lengths, and numeric ranges.
It does not yet establish that identity, contact, document, country, or date
values are canonical, authentic, or semantically valid.

The SQLAlchemy persistence model must not normalize or silently correct
user-controlled values. Input must be validated before a `TournamentSignup`
instance is constructed. Invalid input should be rejected with a clear client
error rather than modified implicitly.

### Input contract

- Receive `tournament_id` from the endpoint path, not from the request body.
- Require email addresses to be lowercase and contain no whitespace.
- Require document identifiers in their canonical representation, without
  whitespace or punctuation. Define the casing rules for documents that contain
  letters before enforcing this requirement.
- Require residence and document-issuing countries as uppercase ISO 3166-1
  alpha-2 codes.
- Validate phone numbers using an explicitly selected international format.
- Reject impossible or future birth dates and define any tournament age rules
  separately from document validation.
- Trim or reject meaningless whitespace-only text without altering legitimate
  names or international characters.
- Delegate CPF, passport, and foreign-document authenticity checks to a
  dedicated document-validation component. Do not assume that all foreign
  documents follow CPF rules.

### Security requirements

- Reject unexpected fields and enforce a request-size limit.
- Never log document identifiers, safety notes, emergency contacts, email
  addresses, or phone numbers.
- Keep `status`, `inscription_number`, `safety_note`, and audit
  timestamps controlled exclusively by the backend.
- Use parameterized SQLAlchemy operations; do not build SQL from user input.
- Add abuse protection to the signup endpoint, including rate limiting
  and an explicit policy for repeated failed requests.
- Ensure public responses never expose private participant or staff-only data.

### Acceptance criteria

- Canonical valid signup input is accepted without being rewritten.
- Noncanonical email, document, country, phone, and date values are rejected.
- Document validation supports CPF, passports, and a defined extension point
  for other foreign documents.
- Duplicate-document checks operate on the same canonical representation
  required by the input contract.
- Unit tests cover valid input, each rejection rule, unexpected fields, and the
  public-response privacy boundary.
- Integration tests confirm that direct and concurrent duplicate signups cannot
  bypass the database uniqueness constraint.

## TODO 2 - Add staff authorization

### Context

Tournament creation, publication, and sign-up listing temporarily require only
a valid Supabase login. Before production use, these operations must require an
explicit staff authorization decision.

### Requirements

- Store staff authorization in trusted Supabase `app_metadata`, never in
  user-editable `user_metadata`.
- Add a reusable FastAPI dependency that returns HTTP 401 for missing or invalid
  authentication and HTTP 403 for authenticated users without the staff role.
- Protect tournament management endpoints and any endpoint that exposes
  non-public sign-up data.
- Add tests for anonymous, authenticated non-staff, and authenticated staff
  requests.
