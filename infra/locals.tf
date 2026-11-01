locals {
  supported_workspaces = {
    dev  = "development"
    prod = "production"
  }

  workspace_is_supported = contains(keys(local.supported_workspaces), terraform.workspace)
  environment_name       = local.workspace_is_supported ? local.supported_workspaces[terraform.workspace] : "unsupported"
  namespace              = "${var.project_slug}-${terraform.workspace}"

  workload_tags = {
    project        = var.project_name
    "project-slug" = var.project_slug
    env            = terraform.workspace
    environment    = local.environment_name
    author         = "Terraform"
    repo           = "karlbruder/karlbruder_monorepo"
  }
}
