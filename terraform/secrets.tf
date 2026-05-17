# ── Secret Manager ────────────────────────────────────────────────────────────

locals {
  secrets = {
    "erpnext-db-root-password" = var.db_root_password
    "erpnext-db-password"      = var.db_password
    "erpnext-admin-password"   = var.admin_password
  }
}

resource "google_secret_manager_secret" "erpnext" {
  for_each  = local.secrets
  secret_id = each.key

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "erpnext" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.erpnext[each.key].id
  secret_data = each.value
}

resource "google_secret_manager_secret_iam_member" "erpnext_accessor" {
  for_each  = local.secrets
  secret_id = google_secret_manager_secret.erpnext[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.erpnext_sa.email}"
}
