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
