import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { runDiscovery } from "@/services/pipeline/discover";
import { runVerification } from "@/services/pipeline/verify";
import { runSynthesis } from "@/services/pipeline/synthesize";
import { saveReport } from "@/services/pipeline/store";
import { sendReviewEmail } from "@/services/pipeline/email";
import type { PendingReport } from "@/services/pipeline/types";

export const maxDuration = 300; // 5 min — pipeline is slow

export async function POST(req: Request) {
  // Authenticate with pipeline secret — fail closed if the secret isn't set.
  const secret = process.env.PIPELINE_SECRET;
  if (!secret) {
    console.error("[pipeline] PIPELINE_SECRET not configured — refusing request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("x-pipeline-secret");
  if (auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dry = searchParams.get("dry") === "true";

  try {
    console.log(`[pipeline] Stage 1: Discovery... (dry=${dry})`);
    const discovered = await runDiscovery();
    console.log(`[pipeline] Discovered ${discovered.length} items`);

    console.log("[pipeline] Stage 2: Verification...");
    const verified = await runVerification(discovered);
    console.log(`[pipeline] Verified ${verified.length} items`);

    console.log("[pipeline] Stage 3: Synthesis...");
    const { reportItems, dropped: synthesisDropped } = await runSynthesis(verified);
    console.log(`[pipeline] Synthesized ${reportItems.length} items, dropped ${synthesisDropped.length}`);

    // Items dropped at the verification stage
    const verificationDropped = discovered
      .filter((d) => !verified.find((v) => v.name === d.name))
      .map((d) => ({ name: d.name, reason: "all sources failed verification" }));

    const allDropped = [...verificationDropped, ...synthesisDropped];

    const report: PendingReport = {
      id: randomBytes(8).toString("hex"),
      token: randomBytes(24).toString("hex"),
      date: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
      status: "pending",
      items: reportItems,
      dropped: allDropped,
      stats: {
        discovered: discovered.length,
        verified: verified.filter((v) => v.status === "verified").length,
        partial: verified.filter((v) => v.status === "partial").length,
        dropped: allDropped.length,
      },
    };

    if (dry) {
      // Return the full report for inspection — no saving, no email
      console.log("[pipeline] Dry run complete — skipping save and email");
      return NextResponse.json({ dry: true, report });
    }

    saveReport(report);
    console.log(`[pipeline] Report saved: ${report.id}`);

    await sendReviewEmail(report);
    console.log("[pipeline] Review email sent");

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      stats: report.stats,
      itemCount: report.items.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pipeline] Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
