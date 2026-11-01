locals {
  project_name = "karlbruder"
  project_slug = "kb"
  repo         = "karlbruder/karlbruder_monorepo"
  scope        = "regional"
  aws_region   = "us-east-2"

  env = terraform.workspace
  environment = lookup(
    {
      dev  = "development"
      prod = "production"
    },
    local.env,
    "unsupported",
  )

  namespace = "${local.project_slug}-${local.env}"

  aws_tags = {
    "author"       = "Terraform"
    "scope"        = local.scope
    "env"          = local.env
    "environment"  = local.environment
    "project-name" = local.project_name
    "project-slug" = local.project_slug
    "repo"         = local.repo
  }
}
