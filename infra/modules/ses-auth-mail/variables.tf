variable "domain_name" {
  description = "Domain verified in SES for Supabase auth mail."
  type        = string
}

variable "aws_region" {
  description = "AWS region where SES sends mail."
  type        = string
}

variable "smtp_iam_user_name" {
  description = "IAM user name for Supabase custom SMTP credentials."
  type        = string
}

variable "from_email_address" {
  description = "From address Supabase should use once the domain is verified."
  type        = string
}
