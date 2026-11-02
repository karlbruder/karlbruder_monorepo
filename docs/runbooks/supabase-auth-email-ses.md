# Supabase auth email through SES

**Created**: 2026-11-01
**Last updated**: 2026-11-02

This runbook covers Supabase Auth mail for the private application. Confirmation and recovery messages use Portuguese Supabase Auth email templates under AUTH-011. The app does not send this mail from the frontend or backend containers.

Backend tournament and payment email is separate. It is not part of this identity.

## What Terraform creates

Workload Terraform in `infra/` creates one account-level SES setup for `karlbruder.com` only when the workspace is `prod`. A `dev` apply does not create a second domain identity or SMTP user.

Resources include the SES domain identity, Easy DKIM, and an IAM user whose only permission is `ses:SendRawEmail`. Region stays `us-east-2`.

Do not run `terraform apply` or `terraform destroy` from automation in this repository. An operator runs apply when the account is ready to publish DNS.

After a prod apply, read `ses_auth_mail` for Cloudflare DNS rows and Supabase SMTP fields. Read `ses_auth_mail_smtp_password` separately (sensitive). Do not commit the password or store it in `.env.example`.

## Apply Terraform (AWS only)

Terraform creates the SES domain identity, enables Easy DKIM in SES, and creates the Supabase SMTP IAM user. It does not write Cloudflare DNS.

From the repository root, with AWS credentials for the Karlbrüder account:

```sh
cd infra
terraform workspace select prod
terraform plan
terraform apply
```

After apply:

```sh
terraform output ses_auth_mail
terraform output -raw ses_auth_mail_smtp_password
```

`ses_auth_mail` includes `cloudflare_dns_records` and `smtp` (host, port, from_address, username).

If you already created the `karlbruder.com` identity in the SES console, import it before apply or Terraform will fail on duplicate resources:

```sh
terraform import 'module.ses_auth_mail[0].aws_ses_domain_identity.this' karlbruder.com
terraform import 'module.ses_auth_mail[0].aws_ses_domain_dkim.this' karlbruder.com
```

Import the IAM user and access key only if you created matching names (`kb-supabase-auth-smtp`). Otherwise let Terraform create a new SMTP user and update the password in Supabase.

## Cloudflare DNS

Cloudflare is authoritative for `karlbruder.com`. Terraform does not manage those records.

1. Run prod apply and use `cloudflare_dns_records` from `terraform output ses_auth_mail`.
2. Add the TXT record and each CNAME in the Cloudflare DNS zone for `karlbruder.com`.
3. Set **DNS only** (grey cloud) on the three DKIM CNAME rows. Do not proxy them.
4. Wait until SES shows the domain as verified and DKIM as successful in the AWS console.

## Leave the SES sandbox

New SES accounts start in the sandbox. Sandbox mail only reaches verified destinations.

Request production access in the SES console for `us-east-2`. Explain that Supabase Auth sends sign-up confirmation and password recovery to application users.

Until production access is granted, you can only test to verified individual addresses.

## Supabase custom SMTP

For each hosted Supabase project the application uses (`dev` and `prod` deployments may share one project or use separate projects):

1. Turn on the email provider and email confirmation in **Authentication → Providers → Email**.
2. Open **Project Settings → Auth → SMTP Settings** and enable custom SMTP.
3. Map fields from `ses_auth_mail.smtp` and `ses_auth_mail_smtp_password` (host, port, username, password, sender from `from_address`). Use STARTTLS on port 587.
4. Replace each Supabase auth email template body with Portuguese copy suitable for sign-up confirmation and password recovery. Keep redirect links in templates aligned with the allow-list in [frontend/README.md](../../frontend/README.md). See AUTH-011 in [authentication and access](../../specs/identity/authentication-and-access.md).
5. Allow the redirect URLs listed in [frontend/README.md](../../frontend/README.md) for each project.

- SES domain and DKIM show verified in AWS.
- Supabase test send or a real sign-up reaches a non-sandbox inbox after production access.
- No SMTP secret appears in git history or application env files.

If a default Supabase template cannot return the user to `/account/sign-in` or `/account/new-password`, stop and report that before changing templates.

## Related docs

- [Deployment spec — Supabase auth email identity](../../specs/platform/deployment.md#supabase-auth-email-identity)
- [Frontend README — account redirects and SMTP overview](../../frontend/README.md)
