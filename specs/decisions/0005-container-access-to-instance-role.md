# 0005: Container access to the instance role

**Created**: 2026-11-01
**Last updated**: 2026-11-01

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Source | Product-owner risk acceptance during deployment troubleshooting on 2026-11-01 |
| Scope | EC2 instance metadata and container AWS credentials in cloud `dev` and `prod` |

## Context

The backend reads its environment's settings from AWS Secrets Manager during startup, including before Alembic migrations run. It uses the AWS SDK's default credential chain and needs the role attached to the application host. The previous metadata response hop limit of 1 prevented Docker bridge containers from obtaining IMDSv2 credentials. Deployment failed with `NoCredentialsError` after the missing Secrets Manager dependency was fixed.

## Decision

Keep the instance metadata endpoint enabled and require IMDSv2 tokens. Set `http_put_response_hop_limit` to 2 in the shared EC2 module so containers can obtain temporary credentials from the instance profile. Use that profile for backend access to Secrets Manager. Do not distribute static AWS access keys to containers.

The owner explicitly accepts the shared host role as a known risk. The metadata setting applies to the host, not only to the backend container. Other containers that can reach metadata can also obtain the role's credentials. A compromised container or a request-forgery vulnerability capable of completing the IMDSv2 exchange could exercise the role's AWS permissions. Those permissions include the environment's backend secret, image pulls, and the host's Session Manager and CloudWatch permissions. IMDSv2 does not create a separate role or permission boundary for each container.

## Safeguards

Keep IMDSv2 required. Limit the host role's permissions to the environment's intended resources and host operations. Keep secret values and temporary credentials out of logs and source files. Treat containers on the application host as sharing its AWS authority.

## Consequences and review

This supersedes the previous hop-limit-1 configuration and its assumption that Docker bridge containers cannot read the host role. Reviews should reference this accepted risk and still identify unexpected permission expansion or credential disclosure.

Reconsider this decision if untrusted workloads share the host, the role gains materially broader permissions, or individual services require independent AWS permission boundaries. The owner decides whether an expanded risk remains acceptable.

The Terraform change must be applied to each intended cloud workspace before it affects a running host. Backend restarts and image deployment alone do not change EC2 metadata options. This record does not establish that the live metadata settings or secret access have been verified.

## References

[Deployment specification](../platform/deployment.md#application-host), [stack decision](0003-local-and-production-stacks.md), [EC2 metadata options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html).
