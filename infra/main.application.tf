data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

module "application" {
  source = "./modules/application-host"

  namespace     = local.namespace
  instance_name = "${local.namespace}-application"
  project_name  = local.project_name
  instance_type = local.application_instance_type
  deploy_path   = "/opt/karlbruder"
  vpc_id        = data.aws_vpc.default.id
  subnet_id     = sort(data.aws_subnets.default.ids)[0]
  tags          = local.aws_tags
}
