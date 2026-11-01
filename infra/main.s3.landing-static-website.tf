module "landing_static_website" {
  source = "./modules/s3-bucket"

  bucket_name_prefix     = "${local.namespace}-landing"
  bucket_namespace_scope = "account_regional"
  versioning_enabled     = true
  public_read            = true
  enforce_ssl_only       = false

  website = {
    index_document = "index.html"
    error_document = "index.html"
  }
}
