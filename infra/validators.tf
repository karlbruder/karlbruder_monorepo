locals {
  allowed_workspaces = ["dev", "prod"]
}

resource "terraform_data" "validate_workspace" {
  lifecycle {
    precondition {
      condition     = contains(local.allowed_workspaces, terraform.workspace)
      error_message = "Only the following workspaces are permitted for this stack: ${join(", ", local.allowed_workspaces)}"
    }
  }
}
