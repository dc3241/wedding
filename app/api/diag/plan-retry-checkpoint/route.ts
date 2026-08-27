/**
 * TEMPORARY staging checkpoint for parse-retry — delete after verification.
 * Preview-only; gated by token.
 */
import { NextResponse } from "next/server";
import { callClaudeForWeddingPlan } from "@/lib/generate-wedding-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DIAG_TOKEN = "recon-parse-2026-08-27-a7f3";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (new URL(request.url).searchParams.get("token") !== DIAG_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const plan = await callClaudeForWeddingPlan(
    {
      projectName: "Repro couple",
      weddingDate: "2026-12-15",
      totalBudget: 75000,
      location: "New York, NY",
      guestEstimate: 150,
      style: "Black & White",
      traditions: null,
      priorities: null,
      vibeNotes: null,
      formality: "black-tie",
      priorityVendorCategoryIds: [],
      alreadyBookedVendorCategoryIds: ["venue"],
    },
    "2026-08-27",
    3,
  );
  const elapsedMs = Date.now() - started;

  return NextResponse.json({
    ok: plan !== null,
    elapsedMs,
    checklistLen: plan?.checklist.length ?? 0,
    budgetLen: plan?.budget.length ?? 0,
    vendorLen: plan?.vendorCategories.length ?? 0,
  });
}
