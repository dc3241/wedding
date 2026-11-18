/**
 * CAL-FEED-01 — private calendar subscription feed.
 * GET /cal/{token}.ics → text/calendar for one wedding: the wedding day,
 * calendar events, payment installments not yet covered by the ledger, and
 * open tasks with due dates. Token-gated (same posture as /invoice/[token]);
 * service-role read scoped to the one project the token resolves to.
 * Not an anon RLS surface: no policy changes, no table exposure.
 */
import { NextResponse } from "next/server";
import { deriveScheduleWaterfall } from "@/lib/budget-aggregates";
import { buildIcs, type IcsEvent } from "@/lib/calendar/ics";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_RE = /^[0-9a-f]{32}$/;

function siteOrigin(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return explicit || new URL(request.url).origin;
}

function money(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "").toLowerCase();
  if (!TOKEN_RE.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, name, wedding_date, archived_at")
    .eq("calendar_feed_token", token)
    .maybeSingle();
  if (!project) {
    return new NextResponse("Not found", { status: 404 });
  }

  const projectId = project.id as string;
  const origin = siteOrigin(request);
  const projectUrl = `${origin}/projects/${projectId}`;
  const todayKey = new Date().toISOString().slice(0, 10);

  const [{ data: eventRows }, { data: items }, { data: schedule }, { data: paid }, { data: tasks }] =
    await Promise.all([
      admin
        .from("calendar_events")
        .select("id, title, starts_at, ends_at, all_day, location, notes")
        .eq("project_id", projectId)
        .order("starts_at", { ascending: true })
        .limit(500),
      admin.from("budget_items").select("id, category, label").eq("project_id", projectId),
      admin
        .from("payment_schedule")
        .select("id, budget_item_id, amount, due_on, label")
        .eq("project_id", projectId),
      admin.from("budget_payments").select("budget_item_id, amount").eq("project_id", projectId),
      admin
        .from("tasks")
        .select("id, title, due_date, status")
        .eq("project_id", projectId)
        .neq("status", "done")
        .not("due_date", "is", null)
        .limit(500),
    ]);

  const events: IcsEvent[] = [];

  if (project.wedding_date) {
    events.push({
      uid: `wedding-${projectId}@usefirstlook.app`,
      title: `💍 ${project.name}`,
      start: project.wedding_date as string,
      allDay: true,
      url: projectUrl,
    });
  }

  for (const row of eventRows ?? []) {
    events.push({
      uid: `event-${row.id}@usefirstlook.app`,
      title: (row.title as string) || "Appointment",
      start: row.all_day ? (row.starts_at as string).slice(0, 10) : (row.starts_at as string),
      end: (row.ends_at as string | null) ?? null,
      allDay: Boolean(row.all_day),
      location: row.location as string | null,
      description: row.notes as string | null,
      url: `${projectUrl}/calendar`,
    });
  }

  const itemById = new Map((items ?? []).map((i) => [i.id as string, i]));
  const paidByItem = new Map<string, number>();
  for (const row of paid ?? []) {
    const id = row.budget_item_id as string;
    paidByItem.set(id, (paidByItem.get(id) ?? 0) + Number(row.amount));
  }
  const byItem = new Map<string, { id: string; budget_item_id: string; amount: number; due_on: string; label: string | null }[]>();
  for (const row of schedule ?? []) {
    const list = byItem.get(row.budget_item_id as string) ?? [];
    list.push({
      id: row.id as string,
      budget_item_id: row.budget_item_id as string,
      amount: Number(row.amount),
      due_on: row.due_on as string,
      label: (row.label as string | null) ?? null,
    });
    byItem.set(row.budget_item_id as string, list);
  }
  for (const [itemId, installments] of byItem) {
    const item = itemById.get(itemId);
    const itemName =
      (item?.label as string | null)?.trim() || (item?.category as string | null)?.trim() || "Payment";
    const { schedule: rows } = deriveScheduleWaterfall(installments, paidByItem.get(itemId) ?? 0, todayKey);
    for (const row of rows) {
      if (row.covered) continue;
      events.push({
        uid: `payment-${row.id}@usefirstlook.app`,
        title: `💳 ${money(row.amount)} due: ${row.label?.trim() || itemName}`,
        start: row.due_on,
        allDay: true,
        url: `${projectUrl}/budget`,
      });
    }
  }

  for (const row of tasks ?? []) {
    events.push({
      uid: `task-${row.id}@usefirstlook.app`,
      title: `✅ ${(row.title as string) || "Task"}`,
      start: row.due_date as string,
      allDay: true,
      url: `${projectUrl}/checklist`,
    });
  }

  const body = buildIcs({ calendarName: `${project.name} · First Look`, events });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="wedding.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
