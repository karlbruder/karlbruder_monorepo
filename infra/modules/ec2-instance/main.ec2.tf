data "aws_ami" "ubuntu_24_04_x86_64" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_security_group" "this" {
  name        = "${var.namespace}-application"
  description = "Application host. Inbound HTTPS only. No SSH."
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }

  dynamic "egress" {
    for_each = var.egress_rules
    content {
      description = egress.value.description
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
    }
  }

  tags = {
    Name = "${var.namespace}-application"
  }
}

resource "aws_instance" "this" {
  ami           = data.aws_ami.ubuntu_24_04_x86_64.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  vpc_security_group_ids      = [aws_security_group.this.id]
  iam_instance_profile        = aws_iam_instance_profile.this.name
  associate_public_ip_address = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
    # Backend startup needs the instance role to read Secrets Manager. See ADR 0005.
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    iops                  = 3000
    throughput            = 125
    encrypted             = true
    delete_on_termination = false

    tags = {
      Name = "${var.instance_name}-root"
    }
  }

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    project_name          = var.project_name
    deploy_path           = var.deploy_path
    userdata_pre_install  = var.userdata_pre_install
    userdata_post_install = var.userdata_post_install
  })

  tags = {
    Name = var.instance_name
  }

  lifecycle {
    # A newer Canonical AMI, or a bootstrap edit, must not replace a running host.
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip" "this" {
  domain = "vpc"

  tags = {
    Name = "${var.instance_name}-eip"
  }
}

resource "aws_eip_association" "this" {
  allocation_id = aws_eip.this.id
  instance_id   = aws_instance.this.id
}
