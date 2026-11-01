resource "aws_secretsmanager_secret" "backend" {
  name = "${local.namespace}/backend"

  tags = {
    Name = "${local.namespace}-backend"
  }
}

resource "aws_iam_role_policy" "application_host_backend_secret_read" {
  name = replace(title(replace("${local.namespace}-backend-secret-read", "-", " ")), " ", "")
  role = module.application_host.iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadBackendSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.backend.arn
      },
    ]
  })
}
