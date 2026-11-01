resource "aws_ses_domain_identity" "this" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

resource "aws_iam_user" "supabase_smtp" {
  name = var.smtp_iam_user_name
}

resource "aws_iam_user_policy" "supabase_smtp_send" {
  name = "${var.smtp_iam_user_name}-ses-send-raw"
  user = aws_iam_user.supabase_smtp.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SupabaseAuthMailSendRaw"
        Effect   = "Allow"
        Action   = ["ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_access_key" "supabase_smtp" {
  user = aws_iam_user.supabase_smtp.name
}
