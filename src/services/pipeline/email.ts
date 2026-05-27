import { Resend } from "resend";
import type { PendingReport, ReportItem } from "./types";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

// ── Review email (sent to the reviewer) ──────────────────────────────────────

function itemToReviewHtml(item: ReportItem, index: number): string {
  const statusColor = item.verification_status === "verified" ? "#22c55e" : "#f59e0b";
  const statusLabel = item.verification_status === "verified" ? "✓ verified" : "◑ partial";

  const evidenceHtml = item.evidence
    .map((ev) => {
      const link = ev.url
        ? `<a href="${ev.url}" style="color:#60a5fa;text-decoration:underline;">${ev.author || "source"}</a>`
        : `<span style="color:#9ca3af;">${ev.author || "source"}</span>`;
      return `<li style="margin-bottom:6px;color:#d1d5db;">"${ev.text}" — ${link}</li>`;
    })
    .join("");

  const sourcesHtml = item.sources
    .map(
      (url) =>
        `<a href="${url}" style="color:#60a5fa;font-size:11px;word-break:break-all;">${url}</a>`
    )
    .join("<br>");

  return `
    <div style="border:1px solid #374151;border-radius:8px;padding:16px;margin-bottom:16px;background:#111827;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="color:#f9fafb;font-weight:700;font-size:14px;">${index + 1}. ${item.name}</span>
        <span style="background:#1f2937;color:#9ca3af;font-size:11px;padding:2px 8px;border-radius:12px;">${item.category}</span>
        <span style="color:${statusColor};font-size:11px;">${statusLabel}</span>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 6px 0;font-style:italic;">${item.type}</p>
      <p style="color:#d1d5db;font-size:13px;margin:0 0 8px 0;">${item.description}</p>
      <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;"><strong style="color:#9ca3af;">Why trending:</strong> ${item.why_trending}</p>
      ${evidenceHtml ? `<ul style="margin:0 0 8px 0;padding-left:16px;font-size:12px;">${evidenceHtml}</ul>` : ""}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #1f2937;font-size:11px;color:#6b7280;">
        Sources:<br>${sourcesHtml}
      </div>
    </div>`;
}

export async function sendReviewEmail(report: PendingReport): Promise<void> {
  const resend = getResend();
  const reviewerEmail = process.env.REVIEWER_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;
  if (!reviewerEmail) throw new Error("REVIEWER_EMAIL is not set");
  if (!fromEmail) throw new Error("FROM_EMAIL is not set");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const approveUrl = `${baseUrl}/api/pipeline/approve/${report.token}`;
  const discardUrl = `${baseUrl}/api/pipeline/discard/${report.token}`;
  const reviewUrl = `${baseUrl}/review/${report.token}`;

  const itemsHtml = report.items.map((item, i) => itemToReviewHtml(item, i)).join("");

  const droppedHtml =
    report.dropped.length > 0
      ? `<div style="margin-top:16px;padding:12px;background:#1f2937;border-radius:8px;">
          <p style="color:#6b7280;font-size:12px;margin:0 0 6px 0;font-weight:600;">DROPPED (${report.dropped.length})</p>
          ${report.dropped.map((d) => `<p style="color:#6b7280;font-size:11px;margin:0;">${d.name}: ${d.reason}</p>`).join("")}
        </div>`
      : "";

  const html = `
<!DOCTYPE html>
<html>
<body style="background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;max-width:700px;margin:0 auto;">
  <div style="margin-bottom:24px;">
    <h1 style="color:#f9fafb;font-size:20px;margin:0 0 4px 0;">📊 AI Trends Report — ${report.date}</h1>
    <p style="color:#6b7280;font-size:13px;margin:0;">
      ${report.stats.discovered} discovered → ${report.stats.verified} verified → ${report.stats.partial} partial → ${report.stats.dropped} dropped → ${report.items.length} in report
    </p>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:24px;">
    <a href="${reviewUrl}" style="background:#1f2937;color:#f9fafb;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      📋 Full Review Page
    </a>
    <a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      ✓ Approve &amp; Send
    </a>
    <a href="${discardUrl}" style="background:#7f1d1d;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      ✕ Discard
    </a>
  </div>

  ${itemsHtml}
  ${droppedHtml}

  <p style="color:#374151;font-size:11px;margin-top:24px;">Report ID: ${report.id} · Token: ${report.token}</p>
</body>
</html>`;

  await resend.emails.send({
    from: fromEmail,
    to: reviewerEmail,
    subject: `[Review] AI Trends Report ${report.date} — ${report.items.length} items`,
    html,
  });
}

// ── Subscriber report email ───────────────────────────────────────────────────

function itemToSubscriberHtml(item: ReportItem, index: number): string {
  const evidenceHtml = item.evidence
    .slice(0, 2)
    .map((ev) => {
      const linkHtml = ev.url
        ? `<a href="${ev.url}" style="color:#60a5fa;text-decoration:none;">${ev.author || "source"}</a>`
        : `<span style="color:#9ca3af;">${ev.author || "source"}</span>`;
      return `<p style="color:#9ca3af;font-size:12px;font-style:italic;margin:4px 0 0 0;">"${ev.text}" — ${linkHtml}</p>`;
    })
    .join("");

  return `
    <div style="border-bottom:1px solid #1f2937;padding:16px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="color:#22c55e;font-size:12px;">⚡</span>
        <span style="color:#f9fafb;font-weight:700;font-size:14px;">${item.name}</span>
        <span style="background:#1f2937;color:#6b7280;font-size:11px;padding:2px 7px;border-radius:10px;">${item.category}</span>
      </div>
      <p style="color:#d1d5db;font-size:13px;margin:0 0 4px 0;">${item.description}</p>
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px 0;">${item.why_trending}</p>
      ${evidenceHtml}
    </div>`;
}

export async function sendSubscriberReport(
  report: PendingReport,
  subscribers: string[]
): Promise<void> {
  if (subscribers.length === 0) return;

  const resend = getResend();
  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) throw new Error("FROM_EMAIL is not set");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const itemsHtml = report.items.map((item, i) => itemToSubscriberHtml(item, i)).join("");

  const html = `
<!DOCTYPE html>
<html>
<body style="background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;max-width:600px;margin:0 auto;">
  <div style="margin-bottom:20px;border-bottom:1px solid #1f2937;padding-bottom:16px;">
    <h1 style="color:#f9fafb;font-size:20px;margin:0 0 4px 0;">This week in AI</h1>
    <p style="color:#6b7280;font-size:13px;margin:0;">${report.date} · ${report.items.length} things worth knowing</p>
  </div>

  ${itemsHtml}

  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1f2937;text-align:center;">
    <a href="${baseUrl}" style="color:#22c55e;font-size:13px;text-decoration:none;font-weight:600;">augmentedwith.ai</a>
    <p style="color:#374151;font-size:11px;margin:8px 0 0 0;">
      <a href="${baseUrl}/unsubscribe?email=%%EMAIL%%" style="color:#374151;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;

  // Send individually so each gets a personalized unsubscribe link
  // For large lists this should use Resend's batch API — fine for now
  const BATCH_SIZE = 50;
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((email) =>
        resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `This week in AI — ${report.date}`,
          html: html.replace("%%EMAIL%%", encodeURIComponent(email)),
        })
      )
    );
  }
}
