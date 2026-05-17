output "instance_name" {
  description = "Name of the Compute Engine instance"
  value       = google_compute_instance.erpnext.name
}

output "external_ip" {
  description = "Static external IP address"
  value       = google_compute_address.erpnext_ip.address
}

output "erpnext_url" {
  description = "ERPNext access URL"
  value       = "http://${google_compute_address.erpnext_ip.address}"
}

output "ssh_command" {
  description = "SSH command via IAP tunnel (no direct SSH)"
  value       = "gcloud compute ssh erpnext-vm --zone=${var.zone} --project=${var.project_id} --tunnel-through-iap"
}

output "service_account_email" {
  description = "Service account used by the VM"
  value       = google_service_account.erpnext_sa.email
}

output "backup_bucket" {
  description = "GCS bucket for ERPNext backups"
  value       = google_storage_bucket.backups.name
}

output "vpc_network" {
  description = "VPC network name"
  value       = google_compute_network.erpnext.name
}

output "startup_log_command" {
  description = "Command to watch startup progress"
  value       = "gcloud compute ssh erpnext-vm --zone=${var.zone} --tunnel-through-iap -- sudo tail -f /var/log/erpnext-startup.log"
}
