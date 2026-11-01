resource "terraform_data" "supported_workspace" {
  lifecycle {
    precondition {
      condition     = local.workspace_is_supported
      error_message = "Select the dev or prod workspace. Other workspaces, including default, are not supported."
    }
  }
}
