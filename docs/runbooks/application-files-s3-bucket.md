# Application files S3 bucket

**Created**: 2026-11-02
**Last updated**: 2026-11-03

This runbook covers the private Amazon S3 bucket that stores tournament uploads such as payment proofs and scanned parental terms. Local development uses Ministack instead. See [data storage](../../specs/platform/data-storage.md) for the environment split.

## What Terraform creates

Workload Terraform in `infra/` creates one private bucket per workspace (`dev` and `prod`). The derived name starts with `kb-<env>-bucket` and includes the account-regional suffix from the shared `s3-bucket` module.

Each bucket blocks public access, enforces HTTPS on the bucket policy, and keeps object versioning enabled. Browser uploads are allowed by a CORS rule for `PUT` and the `Content-Type` header from `https://app.karlbruder.com`, `https://app-prod.karlbruder.com`, and `https://app-dev.karlbruder.com`. That rule does not make objects public. The application host instance role receives `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on objects in that bucket only.

Do not run `terraform apply` or `terraform destroy` from automation in this repository. An operator runs apply when the account is ready.

## Apply Terraform (AWS only)

From the repository root, with AWS credentials for the Karlbrüder account:

```sh
cd infra
terraform workspace select dev
terraform plan
terraform apply
```

Repeat for `prod` when that environment should receive the bucket.

After apply, read the bucket name:

```sh
terraform output application_files_bucket_name
```

## Update the backend secret

Terraform creates the Secrets Manager secret shell but does not write application settings. Before the next deploy that needs file uploads, add or update `S3_BUCKET_NAME` in the JSON secret for that environment (`kb-dev/backend` or `kb-prod/backend`). Use the full name from `application_files_bucket_name`. Leave `S3_ENDPOINT_URL` and `S3_BROWSER_ENDPOINT_URL` unset in both cloud secrets so the backend uses native AWS S3 for server calls and for presigned URLs.

Redeploy or restart the backend container after the secret change so production settings reload.

## Verify

After deploy, exercise a presigned upload through the private application (parental term or payment proof). A 403 or missing bucket error usually means the secret name does not match the applied bucket or the host role policy was not applied in that workspace.
