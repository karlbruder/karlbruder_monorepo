resource "aws_cloudwatch_log_group" "application" {
  for_each = local.application_image_names

  name              = "/${local.namespace}/${each.key}"
  retention_in_days = 0

  lifecycle {
    prevent_destroy = true
  }
}
