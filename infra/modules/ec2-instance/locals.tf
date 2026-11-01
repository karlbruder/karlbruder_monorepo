locals {
  iam_role_name             = "${var.namespace}-application-role"
  iam_instance_profile_name = "${var.namespace}-application-profile"
  alarm_period_seconds      = 60

  ingress_rules = [
    {
      description = "HTTPS"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
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
