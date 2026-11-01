locals {
  iam_role_name             = replace(title(replace("${var.namespace}-application-role", "-", " ")), " ", "")
  iam_instance_profile_name = "${var.namespace}-application-profile"
  alarm_period_seconds = 60

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

  ingress_rules = [
    {
      description = "HTTPS from Cloudflare"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = local.cloudflare_ipv4_cidrs
    },
  ]

  egress_rules = [
    {
      description = "DNS"
      from_port   = 53
      to_port     = 53
      protocol    = "udp"
    },
    {
      description = "DNS over TCP"
      from_port   = 53
      to_port     = 53
      protocol    = "tcp"
    },
    {
      description = "HTTP for Ubuntu package mirrors"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
    },
    {
      description = "HTTPS"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
    },
    {
      description = "Supabase Postgres"
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
    },
    {
      description = "Supabase transaction pooler"
      from_port   = 6543
      to_port     = 6543
      protocol    = "tcp"
    },
    {
      description = "SES SMTP submission"
      from_port   = 587
      to_port     = 587
      protocol    = "tcp"
    },
    {
      description = "NTP"
      from_port   = 123
      to_port     = 123
      protocol    = "udp"
    },
  ]
}
