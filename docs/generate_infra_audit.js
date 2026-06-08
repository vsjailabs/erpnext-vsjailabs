/**
 * ERPNext GCP Infrastructure Audit Report — DOCX Generator
 * Version: 1.0
 * For: VSJ AI Labs
 * Author: Ashish Kumar Satyam
 */

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageBreak, PageNumber, LevelFormat,
} = require("docx");

// ── Brand Colors ────────────────────────────────────────────────────────────
const NAVY    = "1B3A5C";
const BLUE    = "2E75B6";
const GREEN   = "27AE60";
const ORANGE  = "E67E22";
const RED     = "E74C3C";
const DARK    = "2C3E50";
const MEDIUM  = "7F8C8D";
const WHITE   = "FFFFFF";
const LIGHT   = "F0F4F8";
const ALT_ROW = "F8F9FA";
const SUCCESS_BG = "E8F5E9";
const WARNING_BG = "FFF8E1";
const DANGER_BG  = "FFEBEE";

// ── Page Constants ──────────────────────────────────────────────────────────
const PAGE_W = 12240; // US Letter
const PAGE_H = 15840;
const MARGIN = 1440;  // 1 inch
const CONTENT_W = PAGE_W - 2 * MARGIN; // 9360

// ── Helpers ─────────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })] })],
  });
}

function cell(text, width, opts = {}) {
  const { bold, color, fill, font, size: sz, alignment } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: alignment || AlignmentType.LEFT,
      children: [new TextRun({ text, bold: bold || false, color: color || DARK, font: font || "Arial", size: sz || 20 })],
    })],
  });
}

function badgeCell(text, status, width, fill) {
  // status: "green" | "orange" | "red"
  const colorMap = { green: GREEN, orange: ORANGE, red: RED };
  const bgMap = { green: SUCCESS_BG, orange: WARNING_BG, red: DANGER_BG };
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: fill || bgMap[status], type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [
      new TextRun({ text: "● ", color: colorMap[status], font: "Arial", size: 20, bold: true }),
      new TextRun({ text, color: colorMap[status], font: "Arial", size: 20 }),
    ] })],
  });
}

function altRow(idx) { return idx % 2 === 1 ? ALT_ROW : WHITE; }

function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: NAVY })],
  });
}

function subHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: BLUE })],
  });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.alignment || AlignmentType.LEFT,
    children: [new TextRun({ text, font: "Arial", size: 22, color: opts.color || DARK, bold: opts.bold || false })],
  });
}

function codeText(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Consolas", size: 18, color: DARK })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [] });
}

// ── Metric Card ─────────────────────────────────────────────────────────────
function metricCard(label, value, accentColor) {
  const cardW = Math.floor(CONTENT_W / 4);
  return new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 6, color: accentColor }, bottom: noBorder, left: noBorder, right: noBorder },
    width: { size: cardW, type: WidthType.DXA },
    shading: { fill: LIGHT, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({ children: [new TextRun({ text: value, bold: true, font: "Arial", size: 28, color: accentColor })] }),
      new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 18, color: MEDIUM })] }),
    ],
  });
}

// ── Build Document ──────────────────────────────────────────────────────────

// Cover page section
const coverSection = {
  properties: {
    page: {
      size: { width: PAGE_W, height: PAGE_H },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    },
  },
  children: [
    new Paragraph({ spacing: { before: 3000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "VSJ AI Labs", font: "Arial", size: 48, bold: true, color: NAVY })],
    }),
    new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "ERPNext GCP Infrastructure", font: "Arial", size: 36, color: BLUE })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Audit Report", font: "Arial", size: 36, color: BLUE })],
    }),
    new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Migration Planning Document", font: "Arial", size: 24, color: MEDIUM })],
    }),
    new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Version 1.0  |  June 8, 2026", font: "Arial", size: 22, color: MEDIUM })],
    }),
    new Paragraph({ spacing: { before: 1200 }, children: [] }),
    // Metadata table
    new Table({
      width: { size: 5000, type: WidthType.DXA },
      columnWidths: [2000, 3000],
      rows: [
        ["Document ID", "VSJ-INFRA-AUDIT-2026-001"],
        ["Author", "Ashish Kumar Satyam"],
        ["For", "VSJ AI Labs"],
        ["Date", "2026-06-08"],
        ["Classification", "Internal / Confidential"],
      ].map(([k, v], i) => new TableRow({
        children: [
          cell(k, 2000, { bold: true, fill: i % 2 === 0 ? LIGHT : WHITE }),
          cell(v, 3000, { fill: i % 2 === 0 ? LIGHT : WHITE, color: k === "Classification" ? RED : DARK }),
        ],
      })),
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ],
};

// Main content section
const mainChildren = [];

// ── 1. Document Information ─────────────────────────────────────────────────
mainChildren.push(sectionHeading("1. Document Information"));
const docInfoRows = [
  ["Document Name", "ERPNext GCP Infrastructure Audit Report"],
  ["Document ID", "VSJ-INFRA-AUDIT-2026-001"],
  ["Version", "1.0"],
  ["Date", "2026-06-08"],
  ["Owner", "Ashish Kumar Satyam"],
  ["Prepared For", "VSJ AI Labs"],
  ["Stakeholders", "VSJ AI Labs Engineering"],
  ["Classification", "Internal / Confidential"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3000, 6360],
  rows: [
    new TableRow({ children: [headerCell("Field", 3000), headerCell("Value", 6360)] }),
    ...docInfoRows.map(([k, v], i) => new TableRow({
      children: [
        cell(k, 3000, { bold: true, fill: altRow(i) }),
        cell(v, 6360, { fill: altRow(i), color: k === "Classification" ? RED : DARK }),
      ],
    })),
  ],
}));

// ── 2. Version History ──────────────────────────────────────────────────────
mainChildren.push(sectionHeading("2. Version History"));
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1200, 1500, 2600, 4060],
  rows: [
    new TableRow({ children: [headerCell("Version", 1200), headerCell("Date", 1500), headerCell("Author", 2600), headerCell("Changes", 4060)] }),
    new TableRow({ children: [
      cell("1.0", 1200), cell("2026-06-08", 1500), cell("Ashish Kumar Satyam", 2600),
      cell("Initial infrastructure audit for migration planning", 4060),
    ] }),
  ],
}));

// ── 3. Executive Summary ────────────────────────────────────────────────────
mainChildren.push(sectionHeading("3. Executive Summary"));
mainChildren.push(bodyText(
  "The ERPNext v15 staging environment deployed on GCP Compute Engine is currently SUSPENDED due to billing account closure. Both billing accounts linked to the GCP project (project-75134527-836d-48b4-9d7) are in CLOSED state, which means the VM is stopped, Compute/Secret Manager/Firewall APIs are blocked, and data on persistent disks is at risk of deletion after 30 days."
));
mainChildren.push(bodyText(
  "This report provides a complete inventory of all 22 cloud resources, 11 application containers, and critical data paths to enable a full migration to a new environment. The Terraform Infrastructure-as-Code in the git repository is fully reproducible — a fresh deploy can recreate the entire stack from scratch."
));
mainChildren.push(bodyText(
  "Immediate action is required: either re-enable billing on the existing project to recover data, or accept a fresh start on a new project. The DNS records on GoDaddy and the application code in git are independent of GCP and remain unaffected.",
  { bold: true }
));

// ── 4. Dashboard View ───────────────────────────────────────────────────────
mainChildren.push(sectionHeading("4. Dashboard View"));

// Status table
const dashRows = [
  ["GCP Project", "orange", "Billing disabled, project ACTIVE but APIs blocked"],
  ["VM Instance", "red", "Stopped/Suspended due to billing closure"],
  ["Data Disk (100 GB)", "orange", "Exists but at risk of deletion after 30 days"],
  ["Backup Bucket", "orange", "GCS may become inaccessible, data at risk"],
  ["TF State", "orange", "Remote state in GCS, may be lost"],
  ["Domain/DNS", "green", "GoDaddy DNS records independent of GCP"],
  ["Terraform Code", "green", "Full IaC in git repo, fully reproducible"],
  ["Application Code", "green", "frappe_docker + all scripts in repo"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2600, 1800, 4960],
  rows: [
    new TableRow({ children: [headerCell("Component", 2600), headerCell("Status", 1800), headerCell("Details", 4960)] }),
    ...dashRows.map(([comp, status, detail], i) => new TableRow({
      children: [
        cell(comp, 2600, { bold: true, fill: altRow(i) }),
        badgeCell(status === "green" ? "On Track" : status === "red" ? "Stopped" : "At Risk", status, 1800, altRow(i)),
        cell(detail, 4960, { fill: altRow(i) }),
      ],
    })),
  ],
}));

mainChildren.push(spacer());

// Metric cards
const cardW = Math.floor(CONTENT_W / 4);
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [cardW, cardW, cardW, CONTENT_W - 3 * cardW],
  rows: [new TableRow({
    children: [
      metricCard("Total Resources", "22", BLUE),
      metricCard("Monthly Cost (was)", "₹5,863/mo", GREEN),
      metricCard("Current Status", "SUSPENDED", RED),
      metricCard("Data Risk", "HIGH", ORANGE),
    ],
  })],
}));

// ── 5. GCP Project Details ──────────────────────────────────────────────────
mainChildren.push(new Paragraph({ children: [new PageBreak()] }));
mainChildren.push(sectionHeading("5. GCP Project Details"));
const projRows = [
  ["Project Name", "My First Project"],
  ["Project ID", "project-75134527-836d-48b4-9d7"],
  ["Project Number", "1084604736205"],
  ["Lifecycle State", "ACTIVE"],
  ["Billing Account", "01578E-6D3FFC-A8BDAE (CLOSED)"],
  ["Billing Status", "DISABLED"],
  ["Auth Email", "vsjailabs@gmail.com"],
  ["Region", "us-central1"],
  ["Zone", "us-central1-a"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3000, 6360],
  rows: [
    new TableRow({ children: [headerCell("Field", 3000), headerCell("Value", 6360)] }),
    ...projRows.map(([k, v], i) => new TableRow({
      children: [
        cell(k, 3000, { bold: true, fill: altRow(i) }),
        cell(v, 6360, { fill: altRow(i), font: k.includes("ID") || k.includes("Number") || k.includes("Account") ? "Consolas" : "Arial" }),
      ],
    })),
  ],
}));

// ── 6. Compute Resources ────────────────────────────────────────────────────
mainChildren.push(sectionHeading("6. Compute Resources"));
const compRows = [
  ["VM Instance", "erpnext-vm", "e2-standard-2 (2 vCPU, 8 GB RAM)", "red", "Stopped"],
  ["Boot Disk", "erpnext-boot-disk", "50 GB pd-ssd, Ubuntu 22.04 LTS", "orange", "At Risk"],
  ["Data Disk", "erpnext-data-disk-balanced", "100 GB pd-balanced", "orange", "At Risk"],
  ["Static IP", "erpnext-static-ip", "34.121.203.2, us-central1", "orange", "At Risk"],
  ["Service Account", "erpnext-vm-sa", "Logging, Monitoring, Secret Accessor, Storage Admin", "red", "Suspended"],
  ["Snapshot", "erpnext-boot-pre-optimize", "Boot disk snapshot before optimization", "orange", "Unknown"],
  ["Snapshot", "erpnext-data-pre-optimize", "Data disk snapshot before optimization", "orange", "Unknown"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1600, 2400, 3160, 2200],
  rows: [
    new TableRow({ children: [headerCell("Resource", 1600), headerCell("Name", 2400), headerCell("Specification", 3160), headerCell("Status", 2200)] }),
    ...compRows.map(([res, name, spec, status, label], i) => new TableRow({
      children: [
        cell(res, 1600, { bold: true, fill: altRow(i) }),
        cell(name, 2400, { font: "Consolas", fill: altRow(i) }),
        cell(spec, 3160, { fill: altRow(i) }),
        badgeCell(label, status, 2200, altRow(i)),
      ],
    })),
  ],
}));

// ── 7. Network & Security ───────────────────────────────────────────────────
mainChildren.push(sectionHeading("7. Network & Security"));
const netRows = [
  ["VPC Network", "erpnext-vpc", "Custom, no auto-subnets"],
  ["Subnet", "erpnext-subnet", "10.0.0.0/24, Private Google Access enabled"],
  ["Firewall: HTTP", "erpnext-allow-http", "TCP 80,443 from 0.0.0.0/0, tag: erpnext"],
  ["Firewall: SSH", "erpnext-allow-iap-ssh", "TCP 22 from 35.235.240.0/20 (IAP only)"],
  ["Firewall: Internal", "erpnext-allow-internal", "TCP/UDP/ICMP from 10.0.0.0/24"],
  ["Firewall: Health", "erpnext-allow-health-check", "TCP 80 from GCP health probe ranges"],
  ["Cloud NAT", "Removed", "Static IP handles outbound (cost saving)"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2000, 2800, 4560],
  rows: [
    new TableRow({ children: [headerCell("Resource", 2000), headerCell("Name", 2800), headerCell("Configuration", 4560)] }),
    ...netRows.map(([res, name, config], i) => new TableRow({
      children: [
        cell(res, 2000, { bold: true, fill: altRow(i) }),
        cell(name, 2800, { font: "Consolas", fill: altRow(i) }),
        cell(config, 4560, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 8. Secrets & Credentials ────────────────────────────────────────────────
mainChildren.push(sectionHeading("8. Secrets & Credentials"));
const secRows = [
  ["erpnext-db-root-password", "GCP Secret Manager", "MariaDB root password"],
  ["erpnext-db-password", "GCP Secret Manager", "ERPNext database password"],
  ["erpnext-admin-password", "GCP Secret Manager", "ERPNext Administrator login"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3200, 2800, 3360],
  rows: [
    new TableRow({ children: [headerCell("Secret Name", 3200), headerCell("Storage", 2800), headerCell("Purpose", 3360)] }),
    ...secRows.map(([name, store, purpose], i) => new TableRow({
      children: [
        cell(name, 3200, { font: "Consolas", fill: altRow(i) }),
        cell(store, 2800, { fill: altRow(i) }),
        cell(purpose, 3360, { fill: altRow(i) }),
      ],
    })),
  ],
}));
mainChildren.push(bodyText(
  "Note: Secrets are inaccessible while billing is disabled. Values also exist in terraform.tfvars (not committed to git).",
  { color: ORANGE }
));

// ── 9. Storage & Backups ────────────────────────────────────────────────────
mainChildren.push(new Paragraph({ children: [new PageBreak()] }));
mainChildren.push(sectionHeading("9. Storage & Backups"));
const storeRows = [
  ["TF State Bucket", "gs://erpnext-staging-tf-state", "Terraform remote state"],
  ["Backup Bucket", "gs://project-75134527-836d-48b4-9d7-erpnext-backups", "30-day retention, STANDARD class"],
  ["Data Mount", "/mnt/erpnext-data/", "Persistent disk mount point"],
  ["MariaDB Data", "/mnt/erpnext-data/mariadb/", "Database files"],
  ["Redis Data", "/mnt/erpnext-data/redis/", "Cache data"],
  ["Site Files", "/mnt/erpnext-data/sites/", "ERPNext site config, uploads, logos"],
  ["Backup Dir", "/mnt/erpnext-data/backups/", "Local backup copies"],
  ["Backup Cron", "Daily 2 AM UTC", "/etc/cron.d/erpnext-backup"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2000, 4160, 3200],
  rows: [
    new TableRow({ children: [headerCell("Resource", 2000), headerCell("Name / Path", 4160), headerCell("Details", 3200)] }),
    ...storeRows.map(([res, path, detail], i) => new TableRow({
      children: [
        cell(res, 2000, { bold: true, fill: altRow(i) }),
        cell(path, 4160, { font: "Consolas", fill: altRow(i) }),
        cell(detail, 3200, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 10. Monitoring & Alerting ───────────────────────────────────────────────
mainChildren.push(sectionHeading("10. Monitoring & Alerting"));
const monRows = [
  ["Notification Channel", "Email: admin@example.com"],
  ["Uptime Check", "HTTPS on erp.vsjailabs.in:443/api/method/ping, every 5 min"],
  ["CPU Alert", "CPU > 80% sustained 5 min"],
  ["Disk Alert", "Disk > 80% sustained 5 min"],
  ["Uptime Alert", "2 consecutive failures (10 min)"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3000, 6360],
  rows: [
    new TableRow({ children: [headerCell("Resource", 3000), headerCell("Configuration", 6360)] }),
    ...monRows.map(([res, config], i) => new TableRow({
      children: [
        cell(res, 3000, { bold: true, fill: altRow(i) }),
        cell(config, 6360, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 11. Application Stack ───────────────────────────────────────────────────
mainChildren.push(sectionHeading("11. Application Stack"));
const appRows = [
  ["ERPNext", "v15, erpnext app installed", "frappe_docker-backend-1"],
  ["Frappe Framework", "v15", "(same as backend)"],
  ["MariaDB", "Dockerized, data on persistent disk", "frappe_docker-db-1"],
  ["Redis Cache", "Dockerized", "frappe_docker-redis-cache-1"],
  ["Redis Queue", "Dockerized", "frappe_docker-redis-queue-1"],
  ["Scheduler", "Background job scheduler", "frappe_docker-scheduler-1"],
  ["Queue Short", "Short-running background jobs", "frappe_docker-queue-short-1"],
  ["Queue Long", "Long-running background jobs", "frappe_docker-queue-long-1"],
  ["WebSocket", "Real-time updates", "frappe_docker-websocket-1"],
  ["Frontend Nginx", "frappe_docker internal proxy", "frappe_docker-frontend-1"],
  ["Host Nginx", "Reverse proxy, SSL termination", "systemd service (not Docker)"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2000, 3800, 3560],
  rows: [
    new TableRow({ children: [headerCell("Component", 2000), headerCell("Details", 3800), headerCell("Container Name", 3560)] }),
    ...appRows.map(([comp, detail, container], i) => new TableRow({
      children: [
        cell(comp, 2000, { bold: true, fill: altRow(i) }),
        cell(detail, 3800, { fill: altRow(i) }),
        cell(container, 3560, { font: "Consolas", fill: altRow(i) }),
      ],
    })),
  ],
}));
mainChildren.push(spacer());
mainChildren.push(bodyText("Docker Compose requires 4 files for every command:", { bold: true }));
mainChildren.push(codeText("  compose.yaml"));
mainChildren.push(codeText("  overrides/compose.mariadb.yaml"));
mainChildren.push(codeText("  overrides/compose.redis.yaml"));
mainChildren.push(codeText("  overrides/compose.noproxy.yaml"));

// ── 12. Domain & SSL ────────────────────────────────────────────────────────
mainChildren.push(new Paragraph({ children: [new PageBreak()] }));
mainChildren.push(sectionHeading("12. Domain & SSL"));
const domRows = [
  ["Domain", "erp.vsjailabs.in"],
  ["DNS Provider", "GoDaddy"],
  ["DNS Record", "A record: erp → 34.121.203.2"],
  ["SSL Provider", "Let's Encrypt (Certbot)"],
  ["SSL Expiry", "2026-08-16 (will not auto-renew while VM is down)"],
  ["Site Directory", "erp.localhost (internal name)"],
  ["Nginx Host Header", "erp.localhost (must match site directory, NOT public domain)"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2600, 6760],
  rows: [
    new TableRow({ children: [headerCell("Field", 2600), headerCell("Value", 6760)] }),
    ...domRows.map(([k, v], i) => new TableRow({
      children: [
        cell(k, 2600, { bold: true, fill: altRow(i) }),
        cell(v, 6760, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 13. Branding Configuration ──────────────────────────────────────────────
mainChildren.push(sectionHeading("13. Branding Configuration"));
const brandRows = [
  ["Website Settings", "app_name", "VSJ AI Labs"],
  ["Website Settings", "app_logo", "/files/vsj-logo-square.png"],
  ["Website Settings", "splash_image", "/files/vsj-logo-square.png"],
  ["Website Settings", "favicon", "/files/vsj-logo-square.png"],
  ["Website Settings", "banner_image", "/files/vsj-logo-horizontal.png"],
  ["System Settings", "app_name", "VSJ AI Labs"],
  ["Letter Head", "VSJ AI Labs (default)", "Horizontal logo 200px + footer"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2400, 2800, 4160],
  rows: [
    new TableRow({ children: [headerCell("DocType", 2400), headerCell("Field", 2800), headerCell("Value", 4160)] }),
    ...brandRows.map(([dt, field, val], i) => new TableRow({
      children: [
        cell(dt, 2400, { bold: true, fill: altRow(i) }),
        cell(field, 2800, { font: "Consolas", fill: altRow(i) }),
        cell(val, 4160, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 14. Enabled GCP APIs ────────────────────────────────────────────────────
mainChildren.push(sectionHeading("14. Enabled GCP APIs (27)"));
const apis = [
  "analyticshub.googleapis.com", "bigquery.googleapis.com", "bigqueryconnection.googleapis.com",
  "bigquerydatapolicy.googleapis.com", "bigquerydatatransfer.googleapis.com", "bigquerymigration.googleapis.com",
  "bigqueryreservation.googleapis.com", "bigquerystorage.googleapis.com", "cloudapis.googleapis.com",
  "cloudtrace.googleapis.com", "compute.googleapis.com", "dataform.googleapis.com",
  "dataplex.googleapis.com", "datastore.googleapis.com", "dns.googleapis.com",
  "iap.googleapis.com", "logging.googleapis.com", "monitoring.googleapis.com",
  "oslogin.googleapis.com", "secretmanager.googleapis.com", "servicemanagement.googleapis.com",
  "serviceusage.googleapis.com", "sql-component.googleapis.com", "storage-api.googleapis.com",
  "storage-component.googleapis.com", "storage.googleapis.com", "telemetry.googleapis.com",
];
// Two-column table for APIs
const halfLen = Math.ceil(apis.length / 2);
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [600, 4080, 600, 4080],
  rows: [
    new TableRow({ children: [headerCell("#", 600), headerCell("API", 4080), headerCell("#", 600), headerCell("API", 4080)] }),
    ...Array.from({ length: halfLen }, (_, i) => {
      const left = apis[i];
      const right = apis[i + halfLen];
      return new TableRow({
        children: [
          cell(String(i + 1), 600, { fill: altRow(i) }),
          cell(left, 4080, { font: "Consolas", fill: altRow(i) }),
          cell(right ? String(i + halfLen + 1) : "", 600, { fill: altRow(i) }),
          cell(right || "", 4080, { font: "Consolas", fill: altRow(i) }),
        ],
      });
    }),
  ],
}));

// ── 15. Terraform File Layout ───────────────────────────────────────────────
mainChildren.push(new Paragraph({ children: [new PageBreak()] }));
mainChildren.push(sectionHeading("15. Terraform File Layout"));
const tfRows = [
  ["main.tf", "Provider + APIs", "6 google_project_service"],
  ["network.tf", "VPC + Firewall", "VPC, Subnet, 4 Firewall Rules"],
  ["secrets.tf", "Secret Manager", "3 Secrets + Versions + IAM"],
  ["compute.tf", "VM + Disks", "SA, 2 IAM, Boot Disk, Data Disk, Static IP, VM Instance"],
  ["backup.tf", "GCS Backup", "Bucket + IAM"],
  ["monitoring.tf", "Alerts", "Notification Channel, Uptime Check, 3 Alert Policies"],
  ["backend.tf", "Remote State", "GCS backend config"],
  ["variables.tf", "All Variables", "10 variables (3 sensitive)"],
  ["outputs.tf", "All Outputs", "8 outputs"],
  ["startup.sh", "VM Init", "293 lines, idempotent, Certbot-safe"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2000, 2800, 4560],
  rows: [
    new TableRow({ children: [headerCell("File", 2000), headerCell("Domain", 2800), headerCell("Resources", 4560)] }),
    ...tfRows.map(([file, domain, resources], i) => new TableRow({
      children: [
        cell(file, 2000, { font: "Consolas", bold: true, fill: altRow(i) }),
        cell(domain, 2800, { fill: altRow(i) }),
        cell(resources, 4560, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 16. Scripts Inventory ───────────────────────────────────────────────────
mainChildren.push(sectionHeading("16. Scripts Inventory"));
const scriptRows = [
  ["deploy.sh", "Interactive Terraform deploy/destroy", "scripts/deploy.sh"],
  ["backup.sh", "Manual backup trigger + GCS sync", "scripts/backup.sh"],
  ["setup-domain.sh", "Domain migration (add-domain + Nginx + SSL)", "scripts/setup-domain.sh"],
  ["ssh-tunnel.sh", "IAP SSH shortcut", "scripts/ssh-tunnel.sh"],
  ["startup.sh", "VM cloud-init (runs on every boot)", "terraform/startup.sh"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2200, 3960, 3200],
  rows: [
    new TableRow({ children: [headerCell("Script", 2200), headerCell("Purpose", 3960), headerCell("Location", 3200)] }),
    ...scriptRows.map(([script, purpose, loc], i) => new TableRow({
      children: [
        cell(script, 2200, { font: "Consolas", bold: true, fill: altRow(i) }),
        cell(purpose, 3960, { fill: altRow(i) }),
        cell(loc, 3200, { font: "Consolas", fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 17. Known Gotchas ───────────────────────────────────────────────────────
mainChildren.push(sectionHeading("17. Known Gotchas (6)"));
const gotchaRows = [
  ["1", "compose.noproxy.yaml is REQUIRED", "Without it, port 8080 not exposed, Nginx gets 502"],
  ["2", "Host header must match site DIRECTORY name", "erp.localhost, NOT erp.vsjailabs.in"],
  ["3", "bench rename-site does NOT exist in v15", "Use bench setup add-domain instead"],
  ["4", "Secret Manager API needs retry logic", "5 retries with 10s backoff in startup.sh"],
  ["5", "CORS/mixed-content after SSL", "ALL location blocks need full proxy headers"],
  ["6", "startup.sh must NOT overwrite Certbot config", "Checks for 'managed by Certbot' before writing"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [600, 3600, 5160],
  rows: [
    new TableRow({ children: [headerCell("#", 600), headerCell("Gotcha", 3600), headerCell("Details / Mitigation", 5160)] }),
    ...gotchaRows.map(([num, gotcha, detail], i) => new TableRow({
      children: [
        cell(num, 600, { bold: true, fill: altRow(i), alignment: AlignmentType.CENTER }),
        cell(gotcha, 3600, { bold: true, fill: altRow(i), color: ORANGE }),
        cell(detail, 5160, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 18. Migration Risk Assessment ───────────────────────────────────────────
mainChildren.push(new Paragraph({ children: [new PageBreak()] }));
mainChildren.push(sectionHeading("18. Migration Risk Assessment"));
const riskRows = [
  ["Billing stays closed >30 days", "Persistent disks deleted, all data lost", "red", "Critical", "Re-enable billing OR accept fresh start"],
  ["TF state bucket purged", "Cannot terraform destroy old resources", "orange", "High", "Pull state locally before it's lost"],
  ["Static IP released", "DNS points to wrong IP", "orange", "Medium", "Update DNS A record after migration"],
  ["SSL cert expires 2026-08-16", "HTTPS stops working", "green", "Low", "Will provision new cert on new infra"],
  ["Secrets inaccessible", "Cannot recover passwords", "orange", "Medium", "Values in terraform.tfvars locally"],
  ["Backup bucket purged", "Historical backups lost", "orange", "Medium", "Backup bucket was empty"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2200, 2200, 1400, 3560],
  rows: [
    new TableRow({ children: [headerCell("Risk", 2200), headerCell("Impact", 2200), headerCell("Severity", 1400), headerCell("Mitigation", 3560)] }),
    ...riskRows.map(([risk, impact, status, label, mitigation], i) => new TableRow({
      children: [
        cell(risk, 2200, { bold: true, fill: altRow(i) }),
        cell(impact, 2200, { fill: altRow(i) }),
        badgeCell(label, status, 1400, altRow(i)),
        cell(mitigation, 3560, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── 19. Migration Options ───────────────────────────────────────────────────
mainChildren.push(sectionHeading("19. Migration Options"));

mainChildren.push(subHeading("Option A: Re-enable Billing (Same Project)"));
mainChildren.push(bodyText("Re-link a billing account to the existing project. The VM restarts, all data comes back, and the environment is restored to its previous state. This is the fastest option with zero data loss."));
mainChildren.push(bodyText("Risk: Both billing accounts are currently closed. May need to create a new billing account with an active payment method.", { color: ORANGE }));

mainChildren.push(subHeading("Option B: New GCP Project (Fresh Deploy)"));
mainChildren.push(bodyText("Create a new GCP project with active billing, then run deploy.sh to provision the entire stack from Terraform. The infrastructure is fully reproducible from the git repository."));
mainChildren.push(bodyText("Post-deploy tasks: Re-upload logos, reconfigure branding via API, update GoDaddy DNS A record to the new static IP. All application data starts fresh (no historical data carried over)."));

mainChildren.push(subHeading("Option C: Migrate to Different Cloud"));
mainChildren.push(bodyText("Export the data disk (requires temporarily re-enabling billing), then set up an equivalent Docker Compose stack on the target platform (AWS, DigitalOcean, or on-premises). Import the MariaDB dump and site files."));
mainChildren.push(bodyText("This is the most complex option but fully decouples the deployment from GCP.", { color: ORANGE }));

// ── 20. Recommended Action Plan ─────────────────────────────────────────────
mainChildren.push(sectionHeading("20. Recommended Action Plan"));
const actionRows = [
  ["1", "Decision", "Re-enable billing on existing project OR fresh deploy on new project"],
  ["2", "If re-enabling", "GCP Console → Billing → Link active payment method"],
  ["3", "If fresh deploy", "Run scripts/deploy.sh, provide terraform.tfvars, apply"],
  ["4", "DNS Update", "Update GoDaddy A record: erp → new static IP (if changed)"],
  ["5", "SSL Provision", "certbot --nginx -d erp.vsjailabs.in on new VM"],
  ["6", "Branding", "Upload logos + update Website Settings / System Settings / Letter Head via API"],
  ["7", "Verify", "Login page, favicon, print formats, backup cron, monitoring alerts"],
];
mainChildren.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [600, 1800, 6960],
  rows: [
    new TableRow({ children: [headerCell("#", 600), headerCell("Step", 1800), headerCell("Action", 6960)] }),
    ...actionRows.map(([num, step, action], i) => new TableRow({
      children: [
        cell(num, 600, { bold: true, fill: altRow(i), alignment: AlignmentType.CENTER }),
        cell(step, 1800, { bold: true, fill: altRow(i) }),
        cell(action, 6960, { fill: altRow(i) }),
      ],
    })),
  ],
}));

// ── Footer Block ────────────────────────────────────────────────────────────
mainChildren.push(spacer());
mainChildren.push(spacer());
mainChildren.push(new Paragraph({
  border: { top: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
  spacing: { before: 400 },
  children: [],
}));
mainChildren.push(new Paragraph({
  spacing: { before: 120 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Prepared By: Ashish Kumar Satyam  |  VSJ AI Labs  |  erp.vsjailabs.in", font: "Arial", size: 18, color: MEDIUM })],
}));
mainChildren.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Internal / Confidential", font: "Arial", size: 18, color: RED, bold: true })],
}));

const mainSection = {
  properties: {
    page: {
      size: { width: PAGE_W, height: PAGE_H },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    },
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "ERPNext GCP Infrastructure Audit Report  |  v1.0", font: "Arial", size: 16, color: MEDIUM })],
      })],
    }),
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "VSJ AI Labs  |  Page ", font: "Arial", size: 16, color: MEDIUM }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: MEDIUM }),
        ],
      })],
    }),
  },
  children: mainChildren,
};

// ── Create Document ─────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Ashish Kumar Satyam",
  title: "ERPNext GCP Infrastructure Audit Report",
  description: "Complete infrastructure inventory for ERPNext GCP migration planning",
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [coverSection, mainSection],
});

// ── Write File ──────────────────────────────────────────────────────────────
const OUTPUT = __dirname + "/ERPNext_GCP_Infrastructure_Audit_Report_v1.0.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Generated: " + OUTPUT);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
});
