variable "aws_region" {
  description = "AWS region for this stack. Account-regional bucket names include this region."
  type        = string
}

variable "project_name" {
  description = "Full project name in kebab case. Stored on the project tag."
  type        = string
  default     = "karlbruder"

  validation {
    condition     = can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", var.project_name))
    error_message = "project_name must be kebab case."
  }
}

variable "project_slug" {
  description = "Short project name. Used in resource names and on the project-slug tag."
  type        = string
  default     = "karlbruder"

  validation {
    condition     = can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", var.project_slug))
    error_message = "project_slug must be kebab case."
  }
}
