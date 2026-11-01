terraform {
  backend "s3" {
    bucket       = "kb-terraform-976083331699-us-east-2-an"
    key          = "monorepo.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true

    # An empty prefix keeps non-default state at <workspace>/monorepo.tfstate.
    workspace_key_prefix = ""
  }
}
