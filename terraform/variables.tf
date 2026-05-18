variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "machine_type" {
  description = "Compute Engine machine type"
  type        = string
  default     = "e2-standard-2"
}

variable "data_disk_size_gb" {
  description = "Size in GB for the persistent data disk"
  type        = number
  default     = 100
}

variable "erpnext_version" {
  description = "ERPNext version tag (e.g. version-15)"
  type        = string
  default     = "version-15"
}

variable "domain" {
  description = "Domain name for the ERPNext instance (leave empty to use IP)"
  type        = string
  default     = ""
}

variable "admin_email" {
  description = "Admin email for alerts and SSL certificates"
  type        = string
  default     = "admin@example.com"
}

variable "subnet_cidr" {
  description = "CIDR range for the VPC subnet"
  type        = string
  default     = "10.0.0.0/24"
}

variable "backup_retention_days" {
  description = "Number of days to retain backups in GCS"
  type        = number
  default     = 30
}

# ── Sensitive variables ──────────────────────────────────────────────────────

variable "db_root_password" {
  description = "MariaDB root password"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "ERPNext database password"
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "ERPNext administrator password"
  type        = string
  sensitive   = true
}
