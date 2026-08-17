/**
 * AGENT-01a — one-shot unattended-write smoke test.
 * Not scheduled. Not a real automation. CRON_SECRET bearer only.
 *
 * GET /api/cron/agent-write-smoke?projectId=<uuid>
 */
import { NextResponse } from "next/server";
import { executeWriteTool } from "@/lib/assistant/write-tools";
import {
  mintUnattendedWriteSession,
  resolveUnattendedActorUserId,
} from "@/lib/assistant/unattended-write-session";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SMOKE_TITLE = "[AGENT-01a smoke] do not keep";
const SMOKE_BODY =
  "Unattended write smoke test. Safe to delete from Notes.";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId query param is required." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const startedAt = new Date().toISOString();

  try {
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, account_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      throw new Error(projectError.message);
    }
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const userId = await resolveUnattendedActorUserId(
      project.account_id,
      admin,
    );
    const session = await mintUnattendedWriteSession(userId);

    let result: { success?: boolean; note_id?: string; error?: string } = {};
    try {
      result = (await executeWriteTool(
        projectId,
        "add_note",
        { title: SMOKE_TITLE, body: SMOKE_BODY },
        session.client,
      )) as { success?: boolean; note_id?: string; error?: string };
    } catch (writeErr) {
      result = {
        success: false,
        error:
          writeErr instanceof Error ? writeErr.message : "smoke add_note failed",
      };
    }

    const completedAt = new Date().toISOString();
    const ok = result?.success === true && typeof result.note_id === "string";

    const { error: logError } = await admin.from("agent_run_log").insert({
      project_id: projectId,
      trigger_kind: "smoke",
      outcome: ok ? "ok" : "error",
      summary: ok
        ? `smoke add_note ${result.note_id}`
        : result?.error ?? "smoke add_note failed",
      started_at: startedAt,
      completed_at: completedAt,
      acted_as_user_id: userId,
    });

    if (logError) {
      throw new Error(logError.message);
    }

    let noteCreatedBy: string | null | undefined;
    if (ok) {
      const { data: noteRow } = await admin
        .from("notes")
        .select("created_by")
        .eq("id", result.note_id!)
        .maybeSingle();
      noteCreatedBy = noteRow?.created_by ?? null;
    }

    const expired = await mintUnattendedWriteSession(userId, -30);
    let expiredWriteFailed = true;
    let expiredError: string | null = null;
    try {
      const expiredResult = (await executeWriteTool(
        projectId,
        "add_note",
        { title: "should not persist", body: "expired session" },
        expired.client,
      )) as { success?: boolean; note_id?: string; error?: string };

      if (expiredResult?.success === true) {
        expiredWriteFailed = false;
        if (typeof expiredResult.note_id === "string") {
          await admin.from("notes").delete().eq("id", expiredResult.note_id);
        }
      } else {
        expiredError = expiredResult?.error ?? "write rejected";
      }
    } catch (expiredErr) {
      expiredError =
        expiredErr instanceof Error ? expiredErr.message : "write rejected";
    }

    return NextResponse.json({
      ok,
      noteId: ok ? result.note_id : null,
      noteCreatedBy: ok ? (noteCreatedBy ?? null) : null,
      uiAttribution: "Assistant",
      actedAsUserId: userId,
      sessionExpiresAt: session.expiresAt.toISOString(),
      expiredWriteFailed,
      expiredError,
      emailSent: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Smoke test failed.";
    console.error("agent-write-smoke:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
