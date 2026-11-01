variable "namespace" {
  description = "Name prefix for this host. Example: kb-dev."
  type        = string
}

variable "instance_name" {
  description = "Name tag of the instance. Session Manager and later deploy commands target this value."
  type        = string
}

variable "project_name" {
  description = "Project name written into the bootstrap log."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (eg. t3a.micro, t3a.small, t3a.medium)"
  type        = string
}

variable "deploy_path" {
  description = "Host directory created during bootstrap for Compose files and runtime configuration."
  type        = string
}

variable "vpc_id" {
  description = "VPC for the application security group."
  type        = string
}

variable "subnet_id" {
  description = "Subnet for the instance. Use one public subnet in the default VPC."
  type        = string
}

variable "userdata_pre_install" {
  description = "Shell snippet injected before the base bootstrap. Empty by default."
  type        = string
  default     = ""
}

variable "userdata_post_install" {
  description = "Shell snippet injected after the base bootstrap. Empty by default."
  type        = string
  default     = ""
}
