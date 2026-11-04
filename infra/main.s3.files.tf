module "application_files" {
  source = "./modules/s3-bucket"

  bucket_name_prefix     = "${local.namespace}-bucket"
  bucket_namespace_scope = "account_regional"
  public_read            = false
  enforce_ssl_only       = true
  versioning_enabled     = true
}

resource "aws_s3_bucket_cors_configuration" "application_files" {
  bucket = module.application_files.bucket_id

  cors_rule {
    allowed_headers = ["Content-Type"]
    allowed_methods = ["PUT"]
    allowed_origins = [
      "https://app.karlbruder.com",
      "https://app-prod.karlbruder.com",
      "https://app-dev.karlbruder.com",
    ]
    max_age_seconds = 3000
  }
}

resource "aws_iam_role_policy" "application_host_application_files" {
  name = replace(title(replace("${local.namespace}-application-files-s3", "-", " ")), " ", "")
  role = module.application_host.iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ApplicationFilesObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:PutObject",
        ]
        Resource = "${module.application_files.bucket_arn}/*"
      },
    ]
  })
}
