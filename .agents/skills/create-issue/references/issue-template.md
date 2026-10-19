# Detailed issue template

Use this for one agreed delivery slice. Populate the body with decisions established from the request, code, specs, and developer clarification. Resolve unanswered requirements before publication; do not copy the guidance or placeholder text into the final issue.

The repository's stronger issues use a short opening, constraints, nested task checkboxes, resources, a walkthrough, and an acceptance check. Keep that readable style. Add scope and prerequisite detail so the developer can work from the issue alone. Omit optional sections and inapplicable task groups rather than filling them with boilerplate.

## Title

Use a short action and concrete outcome, for example "Preserve API paths in the frontend development proxy". Keep an agreed existing workstream prefix if supplied, but do not invent a ticket sequence.

## Body

```markdown
[One or two short paragraphs explaining the change, its purpose, and the verified starting point. Explain any relevant existing behavior without assuming a closed issue proves it works.]

## Scope

Included:
- [The specific capability, application, or interaction this issue delivers.]
- [The boundary of this slice when a larger feature spans several issues.]

Excluded:
- [Adjacent work intentionally left for another issue, with its link when known.]

## Constraints

- [A required behavior, invariant, or implementation restriction.]
- [An explicitly delegated implementation choice and its limits, if relevant.]

## Dependencies and starting point

- [Prerequisite issue link]: [the exact behavior/artifact required before this work, and whether that prerequisite was verified].
- [A verified existing file, component, service, or configuration this task builds on.]

## Tasks:

- [ ] [Deliver the first cohesive part of the scoped change.]
  - [ ] [Concrete implementation action, naming the established file/area and required behavior.]
  - [ ] [Relevant inputs, outputs, validation, or access rule to implement.]
  - [ ] [Focused verification that proves this part works, with a known command or manual action and expected result.]
- [ ] [Connect the next part of the same outcome, only if needed.]
  - [ ] [Concrete integration/configuration/UI action and the agreed contract it uses.]
  - [ ] [Relevant failure or boundary case and expected behavior.]
  - [ ] [Focused verification of the connection.]
- [ ] [Complete required developer-facing documentation or configuration examples, only when this work changes them.]
  - [ ] [The specific document/example and what must be explained or updated.]

## Resources:

- [Owning spec section](verified GitHub link), `specs/path.md`: [applicable rule/acceptance IDs and the subset this issue covers].
- Spec source revision: [published commit/ref, or an explicit unpublished-source limitation].
- [Relevant code path/link]: [why the developer should start there].
- [Official documentation](verified URL): [the specific topic needed, when useful].

## Walkthrough:

1. [The actor or trigger that starts the flow.]
2. [How the relevant components interact and produce the agreed result.]
3. [How the developer observes the end-to-end outcome.]

## Acceptance check

- [ ] Given [relevant starting state], when [the main action occurs], then [observable expected outcome].
- [ ] Given [a relevant invalid input, permission boundary, or failure], when [the action occurs], then [agreed response and state that must remain correct].
- [ ] [Any other scoped acceptance outcome, such as an agreed configuration change or required documentation.]
```

## How to populate it

- Scope and constraints describe the contract. Task checkboxes describe progress toward delivering it. Acceptance checkboxes describe observable evidence that it is done. Avoid repeating identical bullets in all three places.
- Replace the illustrative task groups with the actual work. Use as many as the slice needs, and nest substeps only where they help a developer track progress. A checkbox should describe one action or outcome the developer can actually mark complete.
- Include enough established detail to implement without reconstructing a conversation: affected application/files, inputs/outputs, known routes or fields, relevant validation/access behavior, and expected failures. Do not invent these details to fill the template. Ask if the source material leaves them unclear.
- Place a test or manual check beside the behavior it verifies when useful. If a test tool/command is not established, ask or state the explicitly delegated choice rather than writing a fictitious passing command. Do not require application tests for a documentation-only issue.
- Name dependencies by the capability they must supply. Link related issues separately if they are not blockers. Do not claim that a closed issue, checked checkbox, or source file proves a live integration works.
- If there are no dependencies, say "No blocking dependencies identified" only after checking. State a verification limitation or ask when it affects readiness.
- Keep only the relevant spec subset in Resources. State the requirement in the body as well as its source IDs. Prefer official references and verified repository paths.
- Omit Walkthrough when the flow is obvious. When included, use numbered steps to explain the interaction, not another implementation checklist.
- Start all work/acceptance checkboxes unchecked. Do not include fictional completed work or evidence.
- Do not assign commits or human review checkpoints here. `plan-issue` turns the approved issue into a separate persisted execution plan.
- A draft with unresolved questions stays a draft. Ask the developer, fold the answers into the relevant sections, then present the completed issue for approval.
