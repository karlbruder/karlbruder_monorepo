provider "aws" {
  region = local.aws_region

  default_tags {
    tags = local.aws_tags
  }
}
