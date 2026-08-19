/**
 * WORKFLOW-02 — Resume automation runs whose delay_days have elapsed.
 * Daily. Same CRON_SECRET bearer gate as AUTO-01 / AGENT-*.
 * Zero due runs is a clean no-op.
 */
import { NextResponse } from "next/server";
import {
  AUTOMATION_RUNS_PER_INVOCATION,
  dispatchDueAutomationRuns,
} from "@/lib/automations/run";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  try {
    const result = await dispatchDueAutomationRuns();
    return NextResponse.json({
      ok: result.errors.length === 0,
      cap: AUTOMATION_RUNS_PER_INVOCATION,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("automation-dispatch:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
