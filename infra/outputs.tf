output "aws_region" {
  description = "Region where this workspace runs."
  value       = local.aws_region
}

output "namespace" {
  description = "Environment namespace used in workload resource names."
  value       = local.namespace
}

output "landing_bucket_name" {
  description = "Name of the landing bucket for this workspace."
  value       = module.landing_static_website.bucket_name
}

output "landing_bucket_arn" {
  description = "ARN of the landing bucket for this workspace."
  value       = module.landing_static_website.bucket_arn
}

output "landing_cloudfront_domain_name" {
  description = "CloudFront hostname for the landing site. Point the Cloudflare CNAME at this name."
  value       = aws_cloudfront_distribution.landing.domain_name
}

output "landing_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for the landing site."
  value       = aws_cloudfront_distribution.landing.id
}

output "application_instance_id" {
  description = "ID of the application EC2 instance."
  value       = module.application_host.instance_id
}

output "application_elastic_ip" {
  description = "Elastic IP of the application host."
  value       = module.application_host.elastic_ip
}

output "application_instance_profile_name" {
  description = "Instance profile attached to the application host."
  value       = module.application_host.instance_profile_name
}

output "application_ecr_repository_urls" {
  description = "ECR repository URLs for the backend, frontend, and nginx images."
  value       = { for name, repository in aws_ecr_repository.application : name => repository.repository_url }
}
