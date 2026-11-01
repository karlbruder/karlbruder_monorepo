output "aws_region" {
  description = "Region where this workspace runs."
  value       = local.aws_region
}

output "namespace" {
  description = "Environment namespace used in workload resource names."
  value       = local.namespace
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

output "backend_secret_name" {
  description = "Secrets Manager name for this environment's backend settings. Terraform creates the secret. It does not write the secret value."
  value       = aws_secretsmanager_secret.backend.name
}

output "application_ecr_repository_urls" {
  description = "ECR repository URLs for the landing, frontend, backend, and nginx images."
  value       = { for name, repository in aws_ecr_repository.application : name => repository.repository_url }
}
