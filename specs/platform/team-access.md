# Team access to AWS

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Operational access foundation, independent of application-user authentication |
| Applications | Auth0, AWS IAM Identity Center, AWS account access |
| Sources | [#19](https://github.com/karlbruder/karlbruder_monorepo/issues/19) |

## Goal

Give the team access to the Karlbrüder AWS account without sharing standing IAM user passwords or granting all contributors administrative permissions.

## Rules

- **TEAM-001:** The intended team sign-in path is Google/Gmail to Auth0, then federation into AWS IAM Identity Center and the AWS access portal.
- **TEAM-002:** IAM Identity Center provides permission-set-based account access and temporary AWS credentials. Day-to-day team access does not depend on standing IAM users.
- **TEAM-003:** The initial policy requested in issue #19 grants Carlos AdministratorAccess and Christian, Vitor, and Bruno ReadOnlyAccess. These are the requested initial assignments, not evidence of deployed grants or a permanent roster.
- **TEAM-004:** AWS team identity is separate from Supabase application identity and does not grant tournament or association-management admin permissions.
- **TEAM-005:** Cloud credentials and federation secrets stay outside the repository. Human SSO policy does not by itself select the credential mechanism for GitHub Actions.

## Acceptance criteria

- **TEAM-AC-001:** An authorized team member completes Google/Auth0/AWS portal sign-in and reaches the intended Karlbrüder account.
- **TEAM-AC-002:** A read-only team member can inspect permitted resources but cannot perform an administrative mutation through the assigned permission set.
- **TEAM-AC-003:** Carlos receives the explicitly authorized administrative access, and the flow does not require sharing an IAM user password.
- **TEAM-AC-004:** AWS access does not confer application admin permissions.

## Implementation baseline

Issue #19 was marked Done in the fetched project inventory, while its body still contains unchecked tasks. No cloud configuration or account grants were inspected during this specification pass. Do not infer live authorization from the board status.

## Open questions

No additional application-role questions. Operational verification and procedures remain below and do not change the application roles or requested AWS permission assignments.

## Implementation and operations decisions

- Verify the actual AWS account/organization setup and permission assignments against TEAM-003. Do not infer deployment from the closed issue.
- Document the authorized administrator's contributor onboarding, removal, and access-change procedure.
- Define emergency access and automation-credential management. The deployment workflow applies this policy rather than selecting a conflicting credential model.

## Related specifications

[Identity decision](../decisions/0002-application-and-team-identity.md), [application authentication](../identity/authentication-and-access.md), [deployment](deployment.md).
