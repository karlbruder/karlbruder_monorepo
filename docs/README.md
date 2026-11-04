# Documentation

**Created**: 2026-11-04
**Last updated**: 2026-11-04

These guides explain how the current system works and how to operate it.
[Specifications](../specs/README.md) own required behavior, contracts, and open
product questions. [Decision records](../specs/decisions/README.md) explain
significant choices. Agent editing rules live in [AGENTS.md](../AGENTS.md) and
applicable child files.

Open only the guide needed for the task. A source description is not evidence
that a live environment has been verified.

| Task | Guide |
| --- | --- |
| Set up local services | [Root README](../README.md#local-setup-with-docker-compose) |
| Work on one application | [Backend](../backend/README.md), [frontend](../frontend/README.md), or [landing](../landing/README.md) |
| Understand the current release pipeline and infrastructure | [Application deployment](deployment.md) |
| Apply, reset, or verify domain migrations | [Database migrations](database-migrations.md) |
| Sign in to AWS as a team member | [AWS team access](aws-team-access.md) |
| Configure a service or deployment access | [Operational runbooks](runbooks/README.md) |

Keep commands and current configuration in their owning guide. Link to the
owning spec for requirements and the relevant ADR for rationale. Issues own
delivery checklists. Local plans own implementation history and checkpoint state.
