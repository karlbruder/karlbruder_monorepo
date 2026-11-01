resource "aws_ecr_repository" "application" {
  for_each = local.application_image_names

  name                 = "${local.namespace}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${local.namespace}-${each.key}"
  }
}

resource "aws_iam_role_policy" "application_host_ecr_pull" {
  name = replace(title(replace("${local.namespace}-application-ecr-pull", "-", " ")), " ", "")
  role = module.application_host.iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrGetAuthorizationToken"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "EcrPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource = [for repository in aws_ecr_repository.application : repository.arn]
      },
    ]
  })
}
