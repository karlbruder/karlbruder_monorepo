locals {
  domain_verification_record = {
    name  = "_amazonses.${aws_ses_domain_identity.this.domain}"
    type  = "TXT"
    value = aws_ses_domain_identity.this.verification_token
  }

  dkim_records = [
    for token in aws_ses_domain_dkim.this.dkim_tokens : {
      name  = "${token}._domainkey.${var.domain_name}"
      type  = "CNAME"
      value = "${token}.dkim.amazonses.com"
    }
  ]
}

output "handoff" {
  description = "DNS rows for Cloudflare and SMTP fields for Supabase custom SMTP."
  value = {
    domain                 = aws_ses_domain_identity.this.domain
    cloudflare_dns_records = concat([local.domain_verification_record], local.dkim_records)
    smtp = {
      host         = "email-smtp.${var.aws_region}.amazonaws.com"
      port         = 587
      from_address = var.from_email_address
      username     = aws_iam_access_key.supabase_smtp.id
    }
  }
}

output "smtp_password" {
  description = "SMTP password for Supabase only. Not included in handoff."
  value       = aws_iam_access_key.supabase_smtp.ses_smtp_password_v4
  sensitive   = true
}
