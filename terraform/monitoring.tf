# ── Notification Channel ──────────────────────────────────────────────────────

resource "google_monitoring_notification_channel" "email" {
  display_name = "ERPNext Admin Email"
  type         = "email"

  labels = {
    email_address = var.admin_email
  }

  depends_on = [google_project_service.monitoring]
}

# ── Uptime Check ─────────────────────────────────────────────────────────────

resource "google_monitoring_uptime_check_config" "erpnext" {
  display_name = "ERPNext Uptime Check"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/api/method/ping"
    port         = 80
    use_ssl      = false
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = google_compute_address.erpnext_ip.address
    }
  }

  depends_on = [google_project_service.monitoring]
}

# ── Alert: CPU > 80% for 5 minutes ──────────────────────────────────────────

resource "google_monitoring_alert_policy" "cpu_high" {
  display_name = "ERPNext VM CPU > 80%"
  combiner     = "OR"

  conditions {
    display_name = "CPU utilization above 80%"

    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND resource.labels.instance_id = \"${google_compute_instance.erpnext.instance_id}\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "1800s"
  }

  depends_on = [google_project_service.monitoring]
}

# ── Alert: Disk usage > 80% ─────────────────────────────────────────────────

resource "google_monitoring_alert_policy" "disk_high" {
  display_name = "ERPNext VM Disk > 80%"
  combiner     = "OR"

  conditions {
    display_name = "Disk utilization above 80%"

    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND resource.labels.instance_id = \"${google_compute_instance.erpnext.instance_id}\" AND metric.type = \"agent.googleapis.com/disk/percent_used\""
      comparison      = "COMPARISON_GT"
      threshold_value = 80
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "1800s"
  }

  depends_on = [google_project_service.monitoring]
}

# ── Alert: Uptime check failing ──────────────────────────────────────────────

resource "google_monitoring_alert_policy" "uptime_failure" {
  display_name = "ERPNext Uptime Check Failing"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failing"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.erpnext.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "1800s"
  }

  depends_on = [google_monitoring_uptime_check_config.erpnext]
}
