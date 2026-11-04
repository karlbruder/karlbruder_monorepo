# GitHub Actions access

**Created**: 2026-11-04
**Last updated**: 2026-11-04

This runbook configures the AWS identity used by the application deployment
workflow. Human AWS sign-in is covered by [team access](../aws-team-access.md).
The workload Terraform does not create this role or the account OIDC provider.
These instructions preserve the existing account policy examples. They do not
establish that live AWS or GitHub configuration has been verified.

[Decision 0004](../../specs/decisions/0004-shared-github-actions-role.md) records
acceptance of one role for build, image publication, and deployment in both
`dev` and `prod`. A credential issued through either environment can exercise
that role's permissions in both. Keep repository access restricted to trusted
maintainers, protect deployment environments, and restrict their allowed refs.

## Create the OIDC provider and role

With authorized administrator access to the Karlbrüder AWS account:

1. Create the account OIDC provider for `https://token.actions.githubusercontent.com`
   with audience `sts.amazonaws.com`, if it does not already exist.
2. Create or update `KbGithubActionsRole` using the trust policy below.
3. Attach the permissions policy in the next section.
4. Configure `AWS_IAM_ROLE_ARN` for the deployment workflow to use that role.

The build, stamp, and deploy jobs select a GitHub environment. Each token has one
`sub` value, ending in `environment:dev` or `environment:prod`. The trust policy
accepts both subjects from this repository only.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::976083331699:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:karlbruder/karlbruder_monorepo:environment:dev",
            "repo:karlbruder/karlbruder_monorepo:environment:prod"
          ]
        }
      }
    }
  ]
}
```

## Attach application permissions

The role can push to the eight application ECR repositories, describe instances,
send `AWS-RunShellScript` to the two named application hosts, and read command
results. Do not add unrelated account administration permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrGetAuthorizationToken",
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Sid": "EcrPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": [
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-dev/landing",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-dev/frontend",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-dev/backend",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-dev/nginx",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-prod/landing",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-prod/frontend",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-prod/backend",
        "arn:aws:ecr:us-east-2:976083331699:repository/kb-prod/nginx"
      ]
    },
    {
      "Sid": "DescribeApplicationHost",
      "Effect": "Allow",
      "Action": ["ec2:DescribeInstances"],
      "Resource": "*"
    },
    {
      "Sid": "SendCommandToApplicationHost",
      "Effect": "Allow",
      "Action": ["ssm:SendCommand"],
      "Resource": "arn:aws:ec2:us-east-2:976083331699:instance/*",
      "Condition": {
        "StringEquals": {
          "ssm:resourceTag/Name": [
            "kb-dev-application-host",
            "kb-prod-application-host"
          ]
        }
      }
    },
    {
      "Sid": "UseRunShellScriptDocument",
      "Effect": "Allow",
      "Action": ["ssm:SendCommand"],
      "Resource": "arn:aws:ssm:us-east-2::document/AWS-RunShellScript"
    },
    {
      "Sid": "ReadCommandResult",
      "Effect": "Allow",
      "Action": ["ssm:GetCommandInvocation"],
      "Resource": "*"
    }
  ]
}
```

## Verify access

Inspect the live provider, role trust, permissions, and GitHub environment
protections against this runbook and decision 0004. Do not infer them from a
successful image build. During an authorized deployment, verify that the workflow
assumes the intended role, publishes images to the selected namespace, and reaches
the intended host through Session Manager. Follow the
[deployment guide](../deployment.md#release-verification) for release checks.

Changes to this guide do not apply IAM policies or verify deployed access.
