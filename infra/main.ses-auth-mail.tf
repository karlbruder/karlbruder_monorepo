module "ses_auth_mail" {
  count  = local.env == "prod" ? 1 : 0
  source = "./modules/ses-auth-mail"

  domain_name        = "karlbruder.com"
  aws_region         = local.aws_region
  smtp_iam_user_name = "${local.project_slug}-supabase-auth-smtp"
  from_email_address = "noreply@karlbruder.com"
}
