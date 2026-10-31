output "bucket_id" {
  description = "ID of the S3 bucket. This is the bucket name."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket."
  value       = aws_s3_bucket.this.arn
}

output "bucket_name" {
  description = "Name of the S3 bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_regional_domain_name" {
  description = "Region-specific REST domain name of the S3 bucket."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "website_endpoint" {
  description = "S3 website endpoint hostname. Null when website hosting is off."
  value       = one(aws_s3_bucket_website_configuration.this[*].website_endpoint)
}

output "website_domain" {
  description = "S3 website domain. Null when website hosting is off."
  value       = one(aws_s3_bucket_website_configuration.this[*].website_domain)
}
