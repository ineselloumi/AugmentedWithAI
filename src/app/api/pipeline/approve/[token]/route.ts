import { loadReport, updateReportStatus, getSubscribers } from "@/services/pipeline/store";
import { sendSubscriberReport } from "@/services/pipeline/email";

// POST-only. GET would be triggered by email link-previewers, antivirus
// scanners, and browser prefetchers — which would auto-send the report
// to subscribers before the human has read it.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const report = loadReport(token);

  if (!report) {
    return new Response("Report not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  if (report.status !== "pending") {
    return new Response(`Report already ${report.status}.`, { status: 409, headers: { "Content-Type": "text/plain" } });
  }

  try {
    updateReportStatus(report.id, "approved");

    const subscribers = getSubscribers();
    await sendSubscriberReport(report, subscribers);

    return new Response(
      `✓ Approved and sent to ${subscribers.length} subscriber${subscribers.length !== 1 ? "s" : ""}.`,
      { status: 200, headers: { "Content-Type": "text/plain" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pipeline/approve]", message);
    return new Response("Internal server error", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}
