variable "project_short_name" {
  description = "Short project name used when the bucket name is derived."
  type        = string
}

variable "env" {
  description = "Environment name used when the bucket name is derived. Example: prod."
  type        = string
}

variable "tags" {
  description = "Tags applied to the bucket."
  type        = map(string)
  default     = {}
}

variable "bucket_name" {
  description = "Full bucket name. When null, the name is derived from project_short_name, env, and bucket_name_suffix. An account-regional name must already include the account id, region, and -an suffix."
  type        = string
  default     = null

  validation {
    condition = (
      var.bucket_name == null
      || var.bucket_namespace_scope != "account_regional"
      || can(regex("^[a-z0-9][a-z0-9.-]*-[0-9]{12}-[a-z0-9-]+-an$", var.bucket_name))
    )
    error_message = "When bucket_namespace_scope is account_regional, bucket_name must match <base-name>-<12-digit-account-id>-<aws-region>-an."
  }
}

variable "bucket_name_suffix" {
  description = "Suffix used when bucket_name is null. Example: landing."
  type        = string
  default     = null
}

variable "bucket_namespace_scope" {
  description = "Bucket namespace. global keeps a globally unique name. account_regional uses the AWS account-regional namespace and appends the account id, region, and -an suffix when the name is derived."
  type        = string
  default     = "global"

  validation {
    condition     = contains(["global", "account_regional"], var.bucket_namespace_scope)
    error_message = "bucket_namespace_scope must be global or account_regional."
  }
}

variable "versioning_enabled" {
  description = "When true, object versioning is enabled. When false, versioning is suspended."
  type        = bool
  default     = true
}

variable "public_read" {
  description = "When true, anonymous callers can s3:GetObject. Block Public Access stays on for ACLs and is opened only for the bucket policy."
  type        = bool
  default     = false
}

variable "enforce_ssl_only" {
  description = "When true, the bucket policy denies requests that are not HTTPS. Leave this false for S3 website hosting, because the website endpoint only accepts HTTP."
  type        = bool
  default     = true
}

variable "website" {
  description = "Static website hosting. index_document is the key suffix for directory requests. error_document is the object key returned for missing keys. Set both to index.html for a React SPA. Null leaves website hosting off."
  type = object({
    index_document = string
    error_document = string
  })
  default = null

  validation {
    condition = var.website == null || (
      length(var.website.index_document) > 0 && length(var.website.error_document) > 0
    )
    error_message = "website.index_document and website.error_document must be non-empty."
  }
}
