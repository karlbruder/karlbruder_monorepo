output "instance_id" {
  description = "ID of the application instance."
  value       = aws_instance.application.id
}

output "elastic_ip" {
  description = "Public IPv4 address of the application Elastic IP."
  value       = aws_eip.application.public_ip
}

output "instance_profile_name" {
  description = "Name of the instance profile attached to the application host."
  value       = aws_iam_instance_profile.application.name
}

output "iam_role_name" {
  description = "Name of the instance role."
  value       = aws_iam_role.application.name
}

output "security_group_id" {
  description = "ID of the application security group."
  value       = aws_security_group.application.id
}
