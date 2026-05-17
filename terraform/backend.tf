terraform {
  backend "gcs" {
    bucket = "erpnext-staging-tf-state"
    prefix = "terraform/state"
  }
}
