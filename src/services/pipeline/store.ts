import fs from "fs";
import path from "path";
import type { PendingReport } from "./types";

const PIPELINE_DIR = path.join(process.cwd(), ".pipeline");
const REPORTS_DIR = path.join(PIPELINE_DIR, "reports");
const SUBSCRIBERS_FILE = path.join(PIPELINE_DIR, "subscribers.json");

function ensureDirs() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([]), "utf-8");
  }
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function saveReport(report: PendingReport): void {
  ensureDirs();
  const file = path.join(REPORTS_DIR, `${report.id}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf-8");
}

export function loadReport(token: string): PendingReport | null {
  ensureDirs();
  const files = fs.readdirSync(REPORTS_DIR);
  for (const f of files) {
    const raw = fs.readFileSync(path.join(REPORTS_DIR, f), "utf-8");
    const report = JSON.parse(raw) as PendingReport;
    if (report.token === token) return report;
  }
  return null;
}

export function updateReportStatus(
  id: string,
  status: "approved" | "discarded"
): void {
  const file = path.join(REPORTS_DIR, `${id}.json`);
  const report = JSON.parse(fs.readFileSync(file, "utf-8")) as PendingReport;
  report.status = status;
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf-8");
}

// ── Subscribers ───────────────────────────────────────────────────────────────

export function getSubscribers(): string[] {
  ensureDirs();
  return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf-8")) as string[];
}

export function addSubscriber(email: string): boolean {
  const list = getSubscribers();
  if (list.includes(email.toLowerCase())) return false; // already subscribed
  list.push(email.toLowerCase());
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  return true;
}

export function removeSubscriber(email: string): void {
  const list = getSubscribers().filter((e) => e !== email.toLowerCase());
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), "utf-8");
}
