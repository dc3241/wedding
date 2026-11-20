"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const PATH = "/admin/planner-sessions";

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) throw new Error("Not authorized.");
  return supabase;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function coupleEmail(sessionId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("planner_sessions")
    .select("requested_by")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data?.requested_by) return null;
  const { data: user } = await admin.auth.admin.getUserById(data.requested_by);
  return user.user?.email ?? null;
}

async function notifyCouple(sessionId: string, subject: string, text: string) {
  const to = await coupleEmail(sessionId);
  if (!to) return;
  await sendEmailBestEffort(
    {
      to,
      subject,
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    },
    "PLANNER-HELP-01 couple notify",
  );
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.usefirstlook.app").replace(/\/$/, "");
}

export async function scheduleSession(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const when = String(formData.get("scheduled_at") ?? "");
  const tzOffset = Number(formData.get("tz_offset") ?? 0);
  const meetingUrl = String(formData.get("meeting_url") ?? "").trim();
  if (!id || !when) throw new Error("Pick a date and time.");
  if (meetingUrl && !/^https:\/\//i.test(meetingUrl)) {
    throw new Error("Meeting link must start with https://");
  }
  // datetime-local has no zone; the form sends the admin browser's offset.
  const local = new Date(`${when}:00Z`);
  const scheduledAt = new Date(local.getTime() + tzOffset * 60_000);

  const { error } = await supabase
    .from("planner_sessions")
    .update({
      status: "scheduled",
      scheduled_at: scheduledAt.toISOString(),
      meeting_url: meetingUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["requested", "scheduled"]);
  if (error) throw new Error(error.message);

  const whenLabel = scheduledAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
    timeZoneName: "short",
  });
  await notifyCouple(
    id,
    "Your planner session is booked",
    [
      `You're booked for ${whenLabel}.`,
      meetingUrl ? `Zoom link: ${meetingUrl}` : "We'll send the Zoom link before the call.",
      "",
      `Need to change it? Cancel at least 24 hours ahead from ${siteUrl()}/account/planner-help and book again.`,
    ].join("\n"),
  );
  revalidatePath(PATH);
}

export async function completeSession(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const recap = String(formData.get("recap") ?? "").trim().slice(0, 8000);
  if (!id) return;
  const { error } = await supabase
    .from("planner_sessions")
    .update({
      status: "completed",
      recap: recap || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (recap) {
    await notifyCouple(
      id,
      "Your planner session recap",
      `${recap}\n\nIt's also saved at ${siteUrl()}/account/planner-help.`,
    );
  }
  revalidatePath(PATH);
}

export async function setSessionStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["no_show", "canceled"].includes(status)) return;
  const { error } = await supabase
    .from("planner_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}
