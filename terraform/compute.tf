# ── Service Account ───────────────────────────────────────────────────────────

resource "google_service_account" "erpnext_sa" {
  account_id   = "erpnext-vm-sa"
  display_name = "ERPNext VM Service Account"
}

resource "google_project_iam_member" "erpnext_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.erpnext_sa.email}"
}

resource "google_project_iam_member" "erpnext_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.erpnext_sa.email}"
}

# ── Disks ────────────────────────────────────────────────────────────────────

resource "google_compute_disk" "erpnext_boot" {
  name  = "erpnext-boot-disk"
  type  = "pd-ssd"
  zone  = var.zone
  image = "ubuntu-os-cloud/ubuntu-2204-lts"
  size  = 50

  depends_on = [google_project_service.compute]
}

resource "google_compute_disk" "erpnext_data" {
  name = "erpnext-data-disk-balanced"
  type = "pd-balanced"
  zone = var.zone
  size = var.data_disk_size_gb

  depends_on = [google_project_service.compute]
}

# ── Static IP ────────────────────────────────────────────────────────────────

resource "google_compute_address" "erpnext_ip" {
  name   = "erpnext-static-ip"
  region = var.region

  depends_on = [google_project_service.compute]
}

# ── Compute Instance ─────────────────────────────────────────────────────────

resource "google_compute_instance" "erpnext" {
  name         = "erpnext-vm"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["erpnext"]

  boot_disk {
    source = google_compute_disk.erpnext_boot.self_link
  }

  attached_disk {
    source      = google_compute_disk.erpnext_data.self_link
    device_name = "erpnext-data"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.erpnext.self_link
    access_config {
      nat_ip = google_compute_address.erpnext_ip.address
    }
  }

  service_account {
    email  = google_service_account.erpnext_sa.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin  = "TRUE"
    erpnext_version = var.erpnext_version
    domain          = var.domain
    admin_email     = var.admin_email
    backup_bucket   = google_storage_bucket.backups.name
    project_id      = var.project_id
  }

  metadata_startup_script = file("${path.module}/startup.sh")

  depends_on = [
    google_project_service.compute,
    google_compute_disk.erpnext_boot,
    google_compute_disk.erpnext_data,
    google_compute_subnetwork.erpnext,
  ]
}
