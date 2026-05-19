import { NextResponse } from "next/server";
import { loadReport, updateReportStatus } from "@/services/pipeline/store";

export async function GET(
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

  updateReportStatus(report.id, "discarded");
  return new Response("✕ Report discarded.", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export { GET as POST };
