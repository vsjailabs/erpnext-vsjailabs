# ── VPC Network ───────────────────────────────────────────────────────────────

resource "google_compute_network" "erpnext" {
  name                    = "erpnext-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.compute]
}

resource "google_compute_subnetwork" "erpnext" {
  name                     = "erpnext-subnet"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.erpnext.id
  private_ip_google_access = true
}

# ── Cloud NAT (outbound internet for VMs without public IP requirement) ──────

resource "google_compute_router" "erpnext" {
  name    = "erpnext-router"
  region  = var.region
  network = google_compute_network.erpnext.id
}

resource "google_compute_router_nat" "erpnext" {
  name                               = "erpnext-nat"
  router                             = google_compute_router.erpnext.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ── Firewall Rules ───────────────────────────────────────────────────────────

resource "google_compute_firewall" "allow_http" {
  name    = "erpnext-allow-http"
  network = google_compute_network.erpnext.id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["erpnext"]
}

resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "erpnext-allow-iap-ssh"
  network = google_compute_network.erpnext.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Google IAP egress range — SSH only through Identity-Aware Proxy
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["erpnext"]
}

resource "google_compute_firewall" "allow_internal" {
  name    = "erpnext-allow-internal"
  network = google_compute_network.erpnext.id

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.subnet_cidr]
  target_tags   = ["erpnext"]
}

resource "google_compute_firewall" "allow_health_check" {
  name    = "erpnext-allow-health-check"
  network = google_compute_network.erpnext.id

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  # GCP health check probe ranges (needed for future LB + uptime checks)
  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["erpnext"]
}
