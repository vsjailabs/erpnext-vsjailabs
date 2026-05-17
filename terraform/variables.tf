variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "project-75134527-836d-48b4-9d7"
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
  default     = "e2-standard-4"
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
  description = "Admin email for SSL certificate (Let's Encrypt)"
  type        = string
  default     = "admin@example.com"
}

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
