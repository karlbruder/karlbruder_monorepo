module "application_host" {
  source = "./modules/ec2-instance"

  namespace     = local.namespace
  instance_name = "${local.namespace}-application-host"
  project_name  = local.project_name
  instance_type = local.application_instance_type
  deploy_path   = "/opt/karlbruder"
  vpc_id        = data.aws_vpc.default.id
  subnet_id     = sort(data.aws_subnets.default.ids)[0]
}
