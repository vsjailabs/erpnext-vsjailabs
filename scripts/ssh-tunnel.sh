#!/usr/bin/env bash
# ssh-tunnel.sh — open ERPNext on localhost:8080 via IAP tunnel (no public IP needed)
# Requires: gcloud auth login, project set
set -euo pipefail

PROJECT="${1:-$(gcloud config get-value project 2>/dev/null)}"
ZONE="${2:-us-central1-a}"

gcloud compute start-iap-tunnel erpnext-vm 80 \
  --local-host-port=localhost:8080 \
  --zone="${ZONE}" \
  --project="${PROJECT}" &

echo "Tunnel open — visit http://localhost:8080"
echo "Press Ctrl+C to close."
wait
