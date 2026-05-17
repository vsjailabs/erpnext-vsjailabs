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
  description = "SSH command to connect to the instance"
  value       = "gcloud compute ssh erpnext-vm --zone=${var.zone} --project=${var.project_id}"
}

output "service_account_email" {
  description = "Service account used by the VM"
  value       = google_service_account.erpnext_sa.email
}
