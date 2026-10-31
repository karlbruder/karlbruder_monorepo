module "landing" {
  source = "./modules/s3-bucket"

  project_short_name = "karlbruder"
  env                = "prod"
  bucket_name_suffix = "landing"

  bucket_namespace_scope = "account_regional"
  versioning_enabled     = true
  public_read            = true
  enforce_ssl_only       = false

  website = {
    index_document = "index.html"
    error_document = "index.html"
  }

  tags = {
    application = "landing"
    purpose     = "public-website"
  }
}
