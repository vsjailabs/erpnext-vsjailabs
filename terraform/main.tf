terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Enable required APIs
resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "dns" {
  service            = "dns.googleapis.com"
  disable_on_destroy = false
}

# Static external IP
resource "google_compute_address" "erpnext_ip" {
  name   = "erpnext-static-ip"
  region = var.region

  depends_on = [google_project_service.compute]
}

# Firewall: allow HTTP, HTTPS, SSH
resource "google_compute_firewall" "erpnext_web" {
  name    = "erpnext-allow-web"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443", "8080"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["erpnext"]

  depends_on = [google_project_service.compute]
}

# Service account for the VM
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

# Boot disk (Ubuntu 22.04)
resource "google_compute_disk" "erpnext_boot" {
  name  = "erpnext-boot-disk"
  type  = "pd-ssd"
  zone  = var.zone
  image = "ubuntu-os-cloud/ubuntu-2204-lts"
  size  = 50

  depends_on = [google_project_service.compute]
}

# Data disk for ERPNext volumes
resource "google_compute_disk" "erpnext_data" {
  name = "erpnext-data-disk"
  type = "pd-ssd"
  zone = var.zone
  size = var.data_disk_size_gb

  depends_on = [google_project_service.compute]
}

# Compute Engine VM
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
    network = "default"
    access_config {
      nat_ip = google_compute_address.erpnext_ip.address
    }
  }

  service_account {
    email  = google_service_account.erpnext_sa.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin   = "TRUE"
    db_root_password = var.db_root_password
    db_password      = var.db_password
    admin_password   = var.admin_password
    erpnext_version  = var.erpnext_version
    domain           = var.domain
    admin_email      = var.admin_email
  }

  metadata_startup_script = file("${path.module}/startup.sh")

  depends_on = [
    google_project_service.compute,
    google_compute_disk.erpnext_boot,
    google_compute_disk.erpnext_data,
  ]
}
