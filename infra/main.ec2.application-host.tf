locals {
  # Published IPv4 list fetched on 2026-11-01 from https://www.cloudflare.com/ips-v4
  cloudflare_ipv4_cidrs = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]

  application_host_ingress_rules = [
    {
      description = "HTTPS from Cloudflare"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = local.cloudflare_ipv4_cidrs
    },
  ]

  application_host_egress_rules = [
    { description = "DNS", from_port = 53, to_port = 53, protocol = "udp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "DNS over TCP", from_port = 53, to_port = 53, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "HTTP for Ubuntu package mirrors", from_port = 80, to_port = 80, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "HTTPS", from_port = 443, to_port = 443, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "Supabase Postgres", from_port = 5432, to_port = 5432, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "Supabase transaction pooler", from_port = 6543, to_port = 6543, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "SES SMTP submission", from_port = 587, to_port = 587, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { description = "NTP", from_port = 123, to_port = 123, protocol = "udp", cidr_blocks = ["0.0.0.0/0"] },
  ]
}

module "application_host" {
  source = "./modules/ec2-instance"

  namespace     = local.namespace
  instance_name = "${local.namespace}-application-host"
  project_name  = local.project_name
  instance_type = local.application_instance_type
  deploy_path   = "/opt/karlbruder"
  vpc_id        = data.aws_vpc.default.id
  subnet_id     = sort(data.aws_subnets.default.ids)[0]
  ingress_rules = local.application_host_ingress_rules
  egress_rules  = local.application_host_egress_rules
}
