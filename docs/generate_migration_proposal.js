/**
 * ERPNext Cloud Migration Proposal — GCP to Utho Cloud
 * Enterprise DOCX for CEO & CTO Approval
 * For: VSJ AI Labs | Author: Ashish Kumar Satyam
 */

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageBreak, PageNumber, LevelFormat,
} = require("docx");

// ── Mild Professional Theme ────────────────────────────────────────────────
const PRIMARY   = "2C3E50"; // Dark slate — headings
const SECONDARY = "34495E"; // Slightly lighter slate — subheadings
const ACCENT    = "2980B9"; // Calm blue — highlights, links
const TEXT      = "333333"; // Near-black — body text
const MUTED     = "7F8C8D"; // Grey — captions, metadata
const SUCCESS   = "27AE60"; // Green — recommended, savings
const WARNING   = "E67E22"; // Orange — caution
const DANGER    = "C0392B"; // Muted red — risks
const WHITE     = "FFFFFF";
const LIGHT_BG  = "F7F9FA"; // Very light grey — alt rows
const HEADER_BG = "ECF0F1"; // Light grey — table headers
const BORDER_C  = "D5D8DC"; // Soft border
const ACCENT_BG = "EBF5FB"; // Very light blue — highlight rows

// ── Page Constants ──────────────────────────────────────────────────────────
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 9360

// ── Helpers ─────────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_C };
const borders = { top: border, bottom: border, left: border, right: border };
const cellPad = { top: 80, bottom: 80, left: 120, right: 120 };

function hCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
    margins: cellPad,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: PRIMARY, font: "Calibri", size: 21 })] })],
  });
}

function tCell(text, width, opts = {}) {
  const { bold, color, fill, font, mono, alignment, size: sz } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: cellPad,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: alignment || AlignmentType.LEFT,
      children: [new TextRun({
        text: text || "",
        bold: bold || false,
        color: color || TEXT,
        font: mono ? "Consolas" : (font || "Calibri"),
        size: sz || 21,
      })],
    })],
  });
}

function badge(text, status, width, fill) {
  const colors = { green: SUCCESS, orange: WARNING, red: DANGER, blue: ACCENT };
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: cellPad,
    verticalAlign: "center",
    children: [new Paragraph({ children: [
      new TextRun({ text: "● ", color: colors[status] || ACCENT, font: "Calibri", size: 21, bold: true }),
      new TextRun({ text, color: colors[status] || TEXT, font: "Calibri", size: 21 }),
    ] })],
  });
}

function alt(i) { return i % 2 === 1 ? LIGHT_BG : WHITE; }

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_C, space: 8 } },
    children: [new TextRun({ text, bold: true, font: "Calibri", size: 28, color: PRIMARY })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Calibri", size: 24, color: SECONDARY })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    alignment: opts.alignment || AlignmentType.LEFT,
    children: [new TextRun({
      text,
      font: "Calibri",
      size: 22,
      color: opts.color || TEXT,
      bold: opts.bold || false,
      italics: opts.italic || false,
    })],
  });
}

function bodyMulti(runs) {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: runs.map(r => new TextRun({
      text: r.text,
      font: "Calibri",
      size: 22,
      color: r.color || TEXT,
      bold: r.bold || false,
      italics: r.italic || false,
    })),
  });
}

function spacer() { return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }); }

function note(text) {
  return new Paragraph({
    spacing: { after: 120 },
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 8 } },
    children: [new TextRun({ text, font: "Calibri", size: 21, color: MUTED, italics: true })],
  });
}

// ── Cover Page ──────────────────────────────────────────────────────────────
const cover = {
  properties: {
    page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
  },
  children: [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "VSJ AI Labs", font: "Calibri", size: 44, bold: true, color: PRIMARY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: ACCENT, space: 12 } },
      children: [new TextRun({ text: "Cloud Infrastructure Migration Proposal", font: "Calibri", size: 32, color: SECONDARY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: "GCP Compute Engine  →  Utho Cloud (India DC)", font: "Calibri", size: 24, color: MUTED })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "ERPNext v15 Staging Environment", font: "Calibri", size: 22, color: MUTED })],
    }),
    new Paragraph({ spacing: { before: 1000 }, children: [] }),
    // Metadata table — centered
    new Table({
      width: { size: 5400, type: WidthType.DXA },
      columnWidths: [2200, 3200],
      rows: [
        ["Document ID", "VSJ-MIG-PROPOSAL-2026-001"],
        ["Version", "1.0"],
        ["Date", "June 8, 2026"],
        ["Prepared By", "Ashish Kumar Satyam"],
        ["For", "VSJ AI Labs"],
        ["Approval", "CEO & CTO"],
        ["Classification", "Internal / Confidential"],
        ["Valid Till", "June 18, 2026"],
      ].map(([k, v], i) => new TableRow({
        children: [
          tCell(k, 2200, { bold: true, fill: i % 2 === 0 ? LIGHT_BG : WHITE, size: 21 }),
          tCell(v, 3200, { fill: i % 2 === 0 ? LIGHT_BG : WHITE, size: 21, color: v === "Internal / Confidential" ? DANGER : TEXT }),
        ],
      })),
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ],
};

// ── Main Content ────────────────────────────────────────────────────────────
const main = [];

// ─── 1. Executive Summary ───────────────────────────────────────────────────
main.push(h1("1. Executive Summary"));
main.push(body(
  "This proposal recommends migrating the ERPNext v15 staging environment from Google Cloud Platform (GCP) Compute Engine to Utho Cloud, an India-based cloud provider. The migration addresses three key concerns: recurring billing disruptions on GCP, higher-than-necessary operational costs, and suboptimal latency for Indian end-users due to the current US-based datacenter."
));
main.push(bodyMulti([
  { text: "The Utho Cloud offering provides " },
  { text: "4 shared vCPU, 8 GB RAM, and 160 GB NVMe SSD storage", bold: true },
  { text: " at " },
  { text: "₹3,594/month", bold: true, color: SUCCESS },
  { text: " (before GST), with datacenters in " },
  { text: "Mumbai, Bangalore, and Noida", bold: true },
  { text: ". This represents a ~30% cost reduction and dramatically improved latency for Indian users." },
]));
main.push(body(
  "The ERPNext application stack (Docker Compose with MariaDB, Redis, and Nginx) is fully portable and requires no application-level changes. A complete backup of the current GCP environment has already been secured."
));

// ─── 2. Background ─────────────────────────────────────────────────────────
main.push(h1("2. Background"));
main.push(h2("2.1 Current State"));
main.push(body(
  "The ERPNext staging environment has been running on GCP since May 2026. The deployment uses Terraform for infrastructure-as-code, Docker Compose for application orchestration, and GCP managed services (Secret Manager, IAP, Cloud Monitoring) for operations."
));
main.push(h2("2.2 Problem Statement"));
main.push(body(
  "The GCP deployment has experienced a critical billing disruption. Both billing accounts linked to the project were closed, causing the VM to be terminated and all API access to be blocked. While billing has been temporarily restored and backups secured, this incident highlights the fragility of the current arrangement."
));
main.push(body("Additionally, the following operational gaps exist:"));

const problemRows = [
  ["Latency", "Server in Iowa, USA — 200+ ms round-trip for Indian users", "orange"],
  ["Cost", "₹5,863/month on GCP for a staging environment", "orange"],
  ["Billing Risk", "Two billing accounts closed; third created as workaround", "red"],
  ["Complexity", "Terraform + Secret Manager + IAP adds overhead for a staging setup", "orange"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1800, 5760, 1800],
  rows: [
    new TableRow({ children: [hCell("Issue", 1800), hCell("Description", 5760), hCell("Severity", 1800)] }),
    ...problemRows.map(([issue, desc, sev], i) => new TableRow({
      children: [
        tCell(issue, 1800, { bold: true, fill: alt(i) }),
        tCell(desc, 5760, { fill: alt(i) }),
        badge(sev === "red" ? "High" : "Medium", sev, 1800, alt(i)),
      ],
    })),
  ],
}));

// ─── 3. Proposed Solution ───────────────────────────────────────────────────
main.push(new Paragraph({ children: [new PageBreak()] }));
main.push(h1("3. Proposed Solution"));
main.push(body(
  "Migrate the complete ERPNext staging environment to Utho Cloud, leveraging their India-based datacenters for lower latency, simpler billing (INR prepaid), and reduced operational overhead."
));

main.push(h2("3.1 Utho Cloud Server Specification"));
const specRows = [
  ["Provider", "Utho Platforms Pvt. Ltd. (utho.com)"],
  ["Server Type", "Shared vCPU Cloud Server"],
  ["vCPU", "4 shared vCPU"],
  ["RAM", "8 GB"],
  ["Storage", "160 GB NVMe SSD (5000 IOPS baseline)"],
  ["Bandwidth", "1 TB / month (outbound)"],
  ["IP Address", "1 Dedicated IPv4"],
  ["Firewall", "Cloud Firewall included"],
  ["OS", "Linux (Ubuntu 22.04 LTS)"],
  ["Datacenter", "Mumbai / Bangalore / Noida (India)"],
  ["Monitoring", "Basic monitoring + access logs"],
  ["Backup", "Agent-based: ₹800/mo + ₹4/GB"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2800, 6560],
  rows: [
    new TableRow({ children: [hCell("Specification", 2800), hCell("Details", 6560)] }),
    ...specRows.map(([k, v], i) => new TableRow({
      children: [
        tCell(k, 2800, { bold: true, fill: alt(i) }),
        tCell(v, 6560, { fill: alt(i) }),
      ],
    })),
  ],
}));

main.push(h2("3.2 Compatibility Assessment"));
main.push(body("The ERPNext Docker Compose stack requires the following minimum resources:"));
const compatRows = [
  ["vCPU", "2 minimum", "4 shared", "● Exceeds", "green"],
  ["RAM", "4 GB minimum", "8 GB", "● Exceeds", "green"],
  ["Storage", "~30 GB (Docker + DB)", "160 GB NVMe", "● Exceeds (5x)", "green"],
  ["Bandwidth", "~50-100 GB/mo (staging)", "1 TB/mo", "● Exceeds (10x)", "green"],
  ["IPv4", "1 dedicated", "1 dedicated", "● Equal", "green"],
  ["Docker Support", "Required", "Full Linux access", "● Supported", "green"],
  ["Certbot/SSL", "Required", "Full root access", "● Supported", "green"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1600, 2000, 2000, 1960, 1800],
  rows: [
    new TableRow({ children: [hCell("Resource", 1600), hCell("ERPNext Needs", 2000), hCell("Utho Provides", 2000), hCell("Verdict", 1960), hCell("Status", 1800)] }),
    ...compatRows.map(([res, need, prov, verdict, status], i) => new TableRow({
      children: [
        tCell(res, 1600, { bold: true, fill: alt(i) }),
        tCell(need, 2000, { fill: alt(i) }),
        tCell(prov, 2000, { fill: alt(i) }),
        tCell(verdict.replace("● ", ""), 1960, { fill: alt(i), color: SUCCESS }),
        badge("Pass", status, 1800, alt(i)),
      ],
    })),
  ],
}));
main.push(note("Verdict: All 7 resource requirements are met or exceeded. ERPNext v15 will run comfortably on this server."));

// ─── 4. Cost Analysis ──────────────────────────────────────────────────────
main.push(new Paragraph({ children: [new PageBreak()] }));
main.push(h1("4. Cost Analysis"));

main.push(h2("4.1 Monthly Cost Comparison"));
const costRows = [
  ["Server / VM", "₹5,863", "₹3,594", "₹2,269", "green"],
  ["Backup Storage (~50 GB)", "~₹100 (GCS)", "₹1,000 (agent)", "-₹900", "orange"],
  ["Monitoring", "Included", "Basic (free)", "₹0", "blue"],
  ["GST (18%)", "Included in GCP", "+₹647", "-₹647", "orange"],
  ["", "", "", "", "blue"],
  ["Total Monthly", "₹5,963", "₹5,241", "₹722 saved", "green"],
  ["Total Annual", "₹71,556", "₹43,257 (prepaid)", "₹28,299 saved", "green"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2600, 1800, 1800, 1800, 1360],
  rows: [
    new TableRow({ children: [hCell("Item", 2600), hCell("GCP (Current)", 1800), hCell("Utho Cloud", 1800), hCell("Difference", 1800), hCell("", 1360)] }),
    ...costRows.filter(r => r[0]).map(([item, gcp, utho, diff, status], i) => new TableRow({
      children: [
        tCell(item, 2600, { bold: item.includes("Total"), fill: item.includes("Total") ? ACCENT_BG : alt(i) }),
        tCell(gcp, 1800, { fill: item.includes("Total") ? ACCENT_BG : alt(i), alignment: AlignmentType.RIGHT }),
        tCell(utho, 1800, { fill: item.includes("Total") ? ACCENT_BG : alt(i), alignment: AlignmentType.RIGHT }),
        tCell(diff, 1800, { fill: item.includes("Total") ? ACCENT_BG : alt(i), color: diff.includes("saved") ? SUCCESS : diff.startsWith("-") ? WARNING : SUCCESS, bold: item.includes("Total"), alignment: AlignmentType.RIGHT }),
        badge(diff.includes("saved") ? "Saving" : diff.startsWith("-") ? "Higher" : "Lower", status, 1360, item.includes("Total") ? ACCENT_BG : alt(i)),
      ],
    })),
  ],
}));

main.push(h2("4.2 Annual Savings Summary"));
main.push(bodyMulti([
  { text: "Monthly saving: " },
  { text: "₹722/month", bold: true, color: SUCCESS },
  { text: " (~12% reduction)" },
]));
main.push(bodyMulti([
  { text: "Annual saving (prepaid): " },
  { text: "₹28,299/year", bold: true, color: SUCCESS },
  { text: " (~40% reduction with Utho annual discount)" },
]));
main.push(note("Utho offers a 15% discount on annual prepaid plans, bringing the server cost from ₹43,128 to ₹36,659/year (₹3,055/month effective)."));

// ─── 5. Technical Migration Plan ───────────────────────────────────────────
main.push(new Paragraph({ children: [new PageBreak()] }));
main.push(h1("5. Technical Migration Plan"));

main.push(h2("5.1 Migration Approach"));
main.push(body("The migration follows a fresh-deploy approach. Since the ERPNext application stack is fully containerized via Docker Compose, the migration is a straightforward reprovisioning exercise. No data migration is required for a staging environment."));

main.push(h2("5.2 Migration Steps"));
const stepRows = [
  ["1", "Provision Utho Server", "Order 4 vCPU / 8 GB server with Ubuntu 22.04, Mumbai DC", "10 min"],
  ["2", "Install Docker Engine", "Install Docker CE + Docker Compose plugin on the server", "15 min"],
  ["3", "Clone frappe_docker", "git clone frappe_docker repo, configure .env with credentials", "10 min"],
  ["4", "Start Application Stack", "docker compose up -d with all 4 compose files", "20 min"],
  ["5", "Create ERPNext Site", "bench new-site with MariaDB root password and admin password", "10 min"],
  ["6", "Configure Nginx", "Install host Nginx, configure reverse proxy to localhost:8080", "15 min"],
  ["7", "Update DNS", "Update GoDaddy A record: erp → new Utho IP address", "5 min"],
  ["8", "Provision SSL", "certbot --nginx -d erp.vsjailabs.in for HTTPS", "5 min"],
  ["9", "Apply Branding", "Upload VSJ AI Labs logos, configure Website/System Settings, Letter Head", "15 min"],
  ["10", "Verify & Test", "Login page, favicon, print formats, backup setup, monitoring", "20 min"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [600, 2200, 4560, 2000],
  rows: [
    new TableRow({ children: [hCell("#", 600), hCell("Step", 2200), hCell("Description", 4560), hCell("Duration", 2000)] }),
    ...stepRows.map(([num, step, desc, dur], i) => new TableRow({
      children: [
        tCell(num, 600, { bold: true, fill: alt(i), alignment: AlignmentType.CENTER }),
        tCell(step, 2200, { bold: true, fill: alt(i) }),
        tCell(desc, 4560, { fill: alt(i) }),
        tCell(dur, 2000, { fill: alt(i), alignment: AlignmentType.CENTER }),
      ],
    })),
  ],
}));
main.push(spacer());
main.push(bodyMulti([
  { text: "Total Estimated Migration Time: " },
  { text: "~2 hours", bold: true, color: ACCENT },
  { text: " (with zero downtime for end-users since this is a staging environment)." },
]));

main.push(h2("5.3 What Does NOT Change"));
const noChangeRows = [
  ["Docker Compose stack", "Same 4 compose files, same 9 containers"],
  ["ERPNext version", "v15 — identical application"],
  ["Domain", "erp.vsjailabs.in — only DNS A record changes"],
  ["SSL", "Certbot + Let’s Encrypt — same approach"],
  ["Branding", "VSJ AI Labs logos — re-applied via API"],
  ["Backup strategy", "Daily automated backups — different storage backend"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [3000, 6360],
  rows: [
    new TableRow({ children: [hCell("Component", 3000), hCell("Status", 6360)] }),
    ...noChangeRows.map(([comp, status], i) => new TableRow({
      children: [
        tCell(comp, 3000, { bold: true, fill: alt(i) }),
        tCell(status, 6360, { fill: alt(i) }),
      ],
    })),
  ],
}));

// ─── 6. Risk Assessment ────────────────────────────────────────────────────
main.push(new Paragraph({ children: [new PageBreak()] }));
main.push(h1("6. Risk Assessment"));

const riskRows = [
  ["Shared vCPU performance", "Low", "Staging workload is light; 4 vCPU provides adequate headroom. Utho offers upgrade paths if needed.", "green"],
  ["Utho platform reliability", "Medium", "Utho is a smaller provider than GCP. Mitigated by automated daily backups and the ability to re-deploy on any cloud from Docker Compose.", "orange"],
  ["1 TB bandwidth limit", "Low", "Staging traffic is minimal (~50-100 GB/mo). Production would need re-evaluation.", "green"],
  ["No managed secrets", "Low", "Credentials stored in .env file on server. Mitigated by SSH key-only access and restricted file permissions.", "green"],
  ["No IAP for SSH", "Low", "Standard SSH with key authentication. Mitigated by disabling password auth and using fail2ban.", "green"],
  ["Data loss during migration", "None", "Fresh deploy for staging; no production data to migrate. GCP backups retained as snapshots.", "green"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2200, 1200, 4360, 1600],
  rows: [
    new TableRow({ children: [hCell("Risk", 2200), hCell("Likelihood", 1200), hCell("Mitigation", 4360), hCell("Residual", 1600)] }),
    ...riskRows.map(([risk, like, mit, status], i) => new TableRow({
      children: [
        tCell(risk, 2200, { bold: true, fill: alt(i) }),
        tCell(like, 1200, { fill: alt(i), alignment: AlignmentType.CENTER }),
        tCell(mit, 4360, { fill: alt(i) }),
        badge(status === "green" ? "Low" : "Medium", status, 1600, alt(i)),
      ],
    })),
  ],
}));

// ─── 7. GCP Decommission Plan ──────────────────────────────────────────────
main.push(h1("7. GCP Decommission Plan"));
main.push(body("After successful migration and verification on Utho Cloud, the following GCP resources will be decommissioned:"));

const decommRows = [
  ["1", "Verify Utho deployment", "Confirm ERPNext is fully operational on Utho for 7 days"],
  ["2", "Stop GCP VM", "gcloud compute instances stop erpnext-vm"],
  ["3", "Retain snapshots (30 days)", "Keep erpnext-boot-backup-20260608 and erpnext-data-backup-20260608 as safety net"],
  ["4", "Run terraform destroy", "Remove all GCP resources (VM, disks, VPC, secrets, buckets)"],
  ["5", "Unlink billing account", "Detach billing to stop all charges"],
  ["6", "Delete snapshots", "After 30-day retention, delete remaining snapshots"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [600, 2600, 6160],
  rows: [
    new TableRow({ children: [hCell("#", 600), hCell("Action", 2600), hCell("Details", 6160)] }),
    ...decommRows.map(([num, action, details], i) => new TableRow({
      children: [
        tCell(num, 600, { bold: true, fill: alt(i), alignment: AlignmentType.CENTER }),
        tCell(action, 2600, { bold: true, fill: alt(i) }),
        tCell(details, 6160, { fill: alt(i) }),
      ],
    })),
  ],
}));
main.push(note("The GCP project and billing account will remain active until all snapshots are deleted and the 30-day safety period has passed."));

// ─── 8. Timeline ───────────────────────────────────────────────────────────
main.push(new Paragraph({ children: [new PageBreak()] }));
main.push(h1("8. Timeline"));

const timeRows = [
  ["Week 1", "Approval + Utho server provisioning", "Obtain CEO/CTO sign-off, order Utho server"],
  ["Week 1", "Migration execution", "Deploy ERPNext on Utho (~2 hours)"],
  ["Week 1-2", "Verification period", "7-day parallel run, monitor stability"],
  ["Week 3", "DNS cutover", "Update GoDaddy A record to Utho IP"],
  ["Week 3", "GCP VM shutdown", "Stop GCP VM, retain snapshots"],
  ["Week 7", "GCP full decommission", "Delete snapshots, destroy Terraform resources"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1600, 3200, 4560],
  rows: [
    new TableRow({ children: [hCell("When", 1600), hCell("Milestone", 3200), hCell("Details", 4560)] }),
    ...timeRows.map(([when, milestone, details], i) => new TableRow({
      children: [
        tCell(when, 1600, { bold: true, fill: alt(i) }),
        tCell(milestone, 3200, { bold: true, fill: alt(i) }),
        tCell(details, 4560, { fill: alt(i) }),
      ],
    })),
  ],
}));

// ─── 9. Recommendation ─────────────────────────────────────────────────────
main.push(h1("9. Recommendation"));
main.push(bodyMulti([
  { text: "We recommend " },
  { text: "proceeding with the migration to Utho Cloud", bold: true, color: ACCENT },
  { text: " for the following reasons:" },
]));

const recRows = [
  ["Cost Efficiency", "₹722/month savings (12% monthly, 40% annual with prepaid)"],
  ["Latency", "India-based DC reduces latency from ~200ms to ~20ms for Indian users"],
  ["Simplicity", "Eliminates Terraform/Secret Manager/IAP complexity for a staging environment"],
  ["Billing Stability", "INR prepaid model avoids GCP billing account closures"],
  ["Portability", "Docker Compose is cloud-agnostic — can move again if needed"],
  ["Zero Risk", "Staging environment with no production data; GCP snapshots retained as fallback"],
];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2400, 6960],
  rows: [
    new TableRow({ children: [hCell("Factor", 2400), hCell("Benefit", 6960)] }),
    ...recRows.map(([factor, benefit], i) => new TableRow({
      children: [
        tCell(factor, 2400, { bold: true, fill: alt(i), color: ACCENT }),
        tCell(benefit, 6960, { fill: alt(i) }),
      ],
    })),
  ],
}));

main.push(h2("9.1 Recommended Utho Plan"));
main.push(bodyMulti([
  { text: "Annual Prepaid: " },
  { text: "₹36,659/year", bold: true, color: SUCCESS },
  { text: " (₹3,055/month effective) + 18% GST = " },
  { text: "₹43,257/year", bold: true },
  { text: " all-inclusive." },
]));
main.push(note("The Utho estimate (VSJ-EST-080626) is valid until June 18, 2026. Annual prepaid includes a 15% discount over monthly billing."));

// ─── 10. Approval ──────────────────────────────────────────────────────────
main.push(h1("10. Approval"));
main.push(body("This proposal requires approval from the CEO and CTO to proceed with the migration."));
main.push(spacer());

// Approval table
const approvalCols = [2400, 2400, 2400, 2160];
main.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: approvalCols,
  rows: [
    new TableRow({ children: [hCell("Role", 2400), hCell("Name", 2400), hCell("Signature", 2400), hCell("Date", 2160)] }),
    ...["CEO", "CTO"].map((role, i) => new TableRow({
      children: [
        tCell(role, 2400, { bold: true, fill: alt(i) }),
        tCell("", 2400, { fill: alt(i) }),
        tCell("", 2400, { fill: alt(i) }),
        tCell("", 2160, { fill: alt(i) }),
      ],
    })),
  ],
}));

main.push(spacer());
main.push(new Paragraph({
  spacing: { before: 200 },
  alignment: AlignmentType.LEFT,
  children: [
    new TextRun({ text: "Decision:  ", font: "Calibri", size: 22, bold: true, color: PRIMARY }),
    new TextRun({ text: "□ Approved    □ Approved with Conditions    □ Rejected", font: "Calibri", size: 22, color: TEXT }),
  ],
}));
main.push(spacer());
main.push(body("Conditions / Remarks:"));
main.push(new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_C, space: 1 } },
  spacing: { after: 200 },
  children: [new TextRun({ text: " ", font: "Calibri", size: 22 })],
}));
main.push(new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_C, space: 1 } },
  spacing: { after: 200 },
  children: [new TextRun({ text: " ", font: "Calibri", size: 22 })],
}));
main.push(new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_C, space: 1 } },
  spacing: { after: 200 },
  children: [new TextRun({ text: " ", font: "Calibri", size: 22 })],
}));

// ─── Footer divider ─────────────────────────────────────────────────────────
main.push(spacer());
main.push(new Paragraph({
  border: { top: { style: BorderStyle.SINGLE, size: 2, color: BORDER_C, space: 8 } },
  spacing: { before: 400 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Prepared By: Ashish Kumar Satyam  |  VSJ AI Labs", font: "Calibri", size: 19, color: MUTED })],
}));
main.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Internal / Confidential", font: "Calibri", size: 19, color: DANGER, bold: true })],
}));

// ── Build Document ──────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Ashish Kumar Satyam",
  title: "Cloud Infrastructure Migration Proposal - GCP to Utho Cloud",
  description: "ERPNext staging migration proposal for CEO & CTO approval",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: PRIMARY },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: SECONDARY },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    cover,
    {
      properties: {
        page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Cloud Migration Proposal  |  VSJ-MIG-PROPOSAL-2026-001  |  v1.0", font: "Calibri", size: 16, color: MUTED })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "VSJ AI Labs  |  Confidential  |  Page ", font: "Calibri", size: 16, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: MUTED }),
            ],
          })],
        }),
      },
      children: main,
    },
  ],
});

const OUTPUT = __dirname + "/ERPNext_Cloud_Migration_Proposal_v1.0.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Generated: " + OUTPUT);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
});
