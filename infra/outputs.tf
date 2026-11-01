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
  value       = module.landing.bucket_name
}

output "landing_bucket_arn" {
  description = "ARN of the landing bucket for this workspace."
  value       = module.landing.bucket_arn
}

output "application_instance_id" {
  description = "ID of the application EC2 instance."
  value       = module.application.instance_id
}

output "application_elastic_ip" {
  description = "Elastic IP of the application host."
  value       = module.application.elastic_ip
}

output "application_instance_profile_name" {
  description = "Instance profile attached to the application host."
  value       = module.application.instance_profile_name
}
