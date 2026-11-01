resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-cpu-high", "-", " ")), " ", "")
  alarm_description   = "EC2 CPU is at least 70 percent for 10 minutes out of 15."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "cpu_usage_active"
  namespace           = "CWAgent"
  statistic           = "Average"
  threshold           = 70
  period              = local.alarm_period_seconds
  evaluation_periods  = 15
  datapoints_to_alarm = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "cpu_critical" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-cpu-critical", "-", " ")), " ", "")
  alarm_description   = "EC2 CPU is at least 90 percent for 10 minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "cpu_usage_active"
  namespace           = "CWAgent"
  statistic           = "Average"
  threshold           = 90
  period              = local.alarm_period_seconds
  evaluation_periods  = 10
  datapoints_to_alarm = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-memory-high", "-", " ")), " ", "")
  alarm_description   = "EC2 memory usage is at least 80 percent for 10 minutes out of 15."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  statistic           = "Average"
  threshold           = 80
  period              = local.alarm_period_seconds
  evaluation_periods  = 15
  datapoints_to_alarm = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "memory_critical" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-memory-critical", "-", " ")), " ", "")
  alarm_description   = "EC2 memory usage is at least 90 percent for 10 minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  statistic           = "Average"
  threshold           = 90
  period              = local.alarm_period_seconds
  evaluation_periods  = 10
  datapoints_to_alarm = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "disk_high" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-disk-high", "-", " ")), " ", "")
  alarm_description   = "EC2 root filesystem usage is at least 80 percent for 10 minutes out of 15."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  statistic           = "Maximum"
  threshold           = 80
  period              = local.alarm_period_seconds
  evaluation_periods  = 15
  datapoints_to_alarm = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
    path       = "/"
    fstype     = "ext4"
  }
}

resource "aws_cloudwatch_metric_alarm" "disk_critical" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-disk-critical", "-", " ")), " ", "")
  alarm_description   = "EC2 root filesystem usage is at least 90 percent for 10 minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  statistic           = "Maximum"
  threshold           = 90
  period              = local.alarm_period_seconds
  evaluation_periods  = 10
  datapoints_to_alarm = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
    path       = "/"
    fstype     = "ext4"
  }
}

resource "aws_cloudwatch_metric_alarm" "status_check_failed" {
  alarm_name          = replace(title(replace("${var.namespace}-ec2-status-check-failed", "-", " ")), " ", "")
  alarm_description   = "EC2 instance or system status check failed for 2 consecutive minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  statistic           = "Maximum"
  threshold           = 1
  period              = local.alarm_period_seconds
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = aws_instance.this.id
  }
}
