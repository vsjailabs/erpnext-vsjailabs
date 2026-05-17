# ── GCS Backup Bucket ────────────────────────────────────────────────────────

resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-erpnext-backups"
  location      = var.region
  force_destroy = true # staging only — set false for production
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = var.backup_retention_days
    }
    action {
      type = "Delete"
    }
  }

  versioning {
    enabled = false
  }

  depends_on = [google_project_service.storage]
}

resource "google_storage_bucket_iam_member" "backup_writer" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.erpnext_sa.email}"
}
