# 0004: Shared GitHub Actions role

**Created**: 2026-11-01
**Last updated**: 2026-11-01

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Source | Product-owner risk acceptance in the security review on 2026-11-01 |
| Scope | GitHub Actions build, image publication, and deployment permissions |

## Context

Karlbrüder is a small application with about one hundred expected users and a small trusted contributor group. The owner accepts the operational tradeoff of one GitHub Actions role for the entire pipeline. Access to change code and run deployment workflows is intended to remain tightly restricted.

## Decision

Keep one GitHub OIDC role, currently `KbGithubActionsRole`, for build, image publication, and deployment. The current pipeline uses that role for both `dev` and `prod`. Splitting build and deployment roles is not required at this scale.

This accepts the combined authority of that role. A compromised job that obtains it can exercise its image publication and host deployment permissions. Because the current role covers both environments, a credential issued through `dev` can also exercise its allowed production operations. A manual production workflow does not create an AWS permission boundary between those operations.

## Safeguards

Keep repository write access and deployment workflow access restricted to trusted maintainers. Protect the deployment environments and restrict which refs may use them. Keep OIDC trust scoped to the intended repository and environments. Limit AWS permissions to the application repositories and hosts. Do not add unrelated account administration privileges.

These safeguards describe the conditions of this decision. This record does not establish that live GitHub or AWS settings have been inspected or verified.

## Consequences and review

Security reviews should reference this accepted risk rather than repeatedly require separate build and deployment roles. Reviews should still identify missing safeguards, unintended trust subjects, new resources reachable by the role, or changes that expand the accepted authority.

Reconsider the decision if the contributor group expands beyond trusted maintainers, untrusted code can run with deployment credentials, production needs an independent permission boundary, or the application's data sensitivity or operational scale changes materially. The owner decides whether a changed risk remains acceptable.

This decision records acceptance of the current combined pipeline role. It does not accept public database access, leaked server credentials, or authorization bypasses. It supersedes earlier review recommendations that require separate pipeline roles solely because the role combines build and deployment permissions.

## References

[Deployment specification](../platform/deployment.md#application-image-deploy), [stack decision](0003-local-and-production-stacks.md).
