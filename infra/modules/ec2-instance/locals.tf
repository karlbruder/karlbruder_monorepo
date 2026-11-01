locals {
  iam_role_name             = replace(title(replace("${var.namespace}-application-role", "-", " ")), " ", "")
  iam_instance_profile_name = "${var.namespace}-application-profile"
  alarm_period_seconds = 60
}
