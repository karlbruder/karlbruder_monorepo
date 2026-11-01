data "aws_caller_identity" "current" {
  count = var.bucket_namespace_scope == "account_regional" && var.bucket_name == null ? 1 : 0
}

data "aws_region" "current" {
  count = var.bucket_namespace_scope == "account_regional" && var.bucket_name == null ? 1 : 0
}

locals {
  bucket_name = (
    var.bucket_name != null ? var.bucket_name :
    var.bucket_namespace_scope == "account_regional" && var.bucket_name_prefix != null
    ? "${var.bucket_name_prefix}-${data.aws_caller_identity.current[0].account_id}-${data.aws_region.current[0].name}-an"
    : var.bucket_name_prefix
  )

  bucket_namespace = var.bucket_namespace_scope == "account_regional" ? "account-regional" : "global"
}

resource "aws_s3_bucket" "this" {
  bucket           = local.bucket_name
  bucket_namespace = local.bucket_namespace
  tags             = var.tags

  lifecycle {
    prevent_destroy = true

    precondition {
      condition     = local.bucket_name != null
      error_message = "Set bucket_name, or set bucket_name_prefix so the module can derive a name."
    }

    precondition {
      condition     = var.website == null || var.public_read
      error_message = "Website hosting needs public_read so anonymous visitors can load objects."
    }

    precondition {
      condition     = var.website == null || !var.enforce_ssl_only
      error_message = "S3 website endpoints only accept HTTP. Set enforce_ssl_only to false when website hosting is enabled."
    }
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = !var.public_read
  restrict_public_buckets = !var.public_read
}

resource "aws_s3_bucket_website_configuration" "this" {
  count = var.website == null ? 0 : 1

  bucket = aws_s3_bucket.this.id

  index_document {
    suffix = var.website.index_document
  }

  error_document {
    key = var.website.error_document
  }
}

data "aws_iam_policy_document" "this" {
  count = var.enforce_ssl_only || var.public_read ? 1 : 0

  dynamic "statement" {
    for_each = var.enforce_ssl_only ? [1] : []

    content {
      sid       = "DenyInsecureTransport"
      effect    = "Deny"
      actions   = ["s3:*"]
      resources = [aws_s3_bucket.this.arn, "${aws_s3_bucket.this.arn}/*"]

      principals {
        type        = "*"
        identifiers = ["*"]
      }

      condition {
        test     = "Bool"
        variable = "aws:SecureTransport"
        values   = ["false"]
      }
    }
  }

  dynamic "statement" {
    for_each = var.public_read ? [1] : []

    content {
      sid       = "PublicReadGetObject"
      effect    = "Allow"
      actions   = ["s3:GetObject"]
      resources = ["${aws_s3_bucket.this.arn}/*"]

      principals {
        type        = "*"
        identifiers = ["*"]
      }
    }
  }
}

resource "aws_s3_bucket_policy" "this" {
  count = var.enforce_ssl_only || var.public_read ? 1 : 0

  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.this[0].json

  depends_on = [aws_s3_bucket_public_access_block.this]
}
