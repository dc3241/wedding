import { notFound } from "next/navigation";
import { CoupleDashboard } from "@/components/dashboard/couple-dashboard";
import {
  buildOverviewData,
  type OverviewReadError,
  type OverviewTask,
} from "@/components/dashboard/overview-data";
import { PlannerDashboard, buildLastContactMap } from "@/components/dashboard/planner-dashboard";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import type { RsvpStatus } from "./guests/types";
import { getAccountContext } from "@/lib/account-context";
import { displayCoupleNames } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

function parseRsvpStatus(value: string | null | undefined): RsvpStatus {
  if (value === "attending" || value === "declined" || value === "pending") {
    return value;
  }
  return "pending";
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  const isPlanner = account?.kind === "business";

  const [
    projectResult,
    tasksResult,
    vendorResult,
    budgetItemsResult,
    paymentsResult,
    guestsResult,
    membersResult,
    scheduleResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, wedding_date, total_budget")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, phase, position")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("project_vendors")
      .select(
        "id, status, quoted_price, vendors(id, name, category, contact_email, website, ai_overview, last_enriched_at)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_items")
      .select(
        "id, category, label, planned_amount, actual_amount, due_date, notes, project_vendor_id",
      )
      .eq("project_id", projectId)
      .order("category", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true }),
    supabase
      .from("budget_payments")
      .select("id, budget_item_id, amount, paid_on, note")
      .eq("project_id", projectId),
    supabase
      .from("guests")
      .select("id, party_size, rsvp_status")
      .eq("project_id", projectId),
    supabase
      .from("guest_members")
      .select("id, guest_id")
      .eq("project_id", projectId),
    supabase
      .from("payment_schedule")
      .select("id, budget_item_id, amount, due_on, label")
      .eq("project_id", projectId)
      .order("due_on", { ascending: true }),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;

  const errors: OverviewReadError = {
    project: Boolean(projectResult.error),
    tasks: Boolean(tasksResult.error),
    vendors: Boolean(vendorResult.error),
    budgetItems: Boolean(budgetItemsResult.error),
    payments: Boolean(paymentsResult.error),
    guests: Boolean(guestsResult.error || membersResult.error),
    schedule: Boolean(scheduleResult.error),
  };

  const vendors: OutreachVendor[] = (vendorResult.data ?? [])
    .map((row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor) return null;
      return {
        id: row.id,
        status: row.status as OutreachVendor["status"],
        quoted_price:
          row.quoted_price === null || row.quoted_price === undefined
            ? null
            : Number(row.quoted_price),
        vendor,
      };
    })
    .filter((item): item is OutreachVendor => item !== null);

  let vendorsWithContact = vendors.map((vendor) => ({
    ...vendor,
    lastContact: null as string | null,
  }));

  if (isPlanner) {
    const vendorIds = vendors.map((vendor) => vendor.id);
    const messagesResult =
      vendorIds.length > 0
        ? await supabase
            .from("outreach_messages")
            .select("project_vendor_id, sent_at, updated_at")
            .in("project_vendor_id", vendorIds)
        : { data: [] as { project_vendor_id: string; sent_at: string | null; updated_at: string | null }[], error: null };

    if (messagesResult.error) {
      errors.vendors = true;
    } else {
      const lastContactByVendor = buildLastContactMap(messagesResult.data ?? []);
      vendorsWithContact = vendors.map((vendor) => ({
        ...vendor,
        lastContact: lastContactByVendor.get(vendor.id) ?? null,
      }));
    }
  }

  const totalBudget =
    project.total_budget === null || project.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const tasks = ((tasksResult.data ?? []) as OverviewTask[]).map((task) => ({
    ...task,
    status: task.status as OverviewTask["status"],
  }));

  const budgetItems = (budgetItemsResult.data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    planned_amount: Number(row.planned_amount),
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    due_date: row.due_date ?? null,
    notes: row.notes,
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const payments = (paymentsResult.data ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    paid_on: row.paid_on ?? null,
    note: row.note ?? null,
  }));

  const scheduleRows = (scheduleResult.data ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    due_on: row.due_on,
    label: row.label ?? null,
  }));

  // Person-grain RSVP band — same construction as Guests tab summary.
  const rsvpByGuestId = new Map(
    (guestsResult.data ?? []).map((guest) => [
      guest.id as string,
      parseRsvpStatus(guest.rsvp_status as string | null),
    ]),
  );
  const people = (membersResult.data ?? [])
    .map((member) => {
      const status = rsvpByGuestId.get(member.guest_id as string);
      if (!status) return null;
      return { rsvp_status: status };
    })
    .filter((row): row is { rsvp_status: RsvpStatus } => row !== null);

  const overview = buildOverviewData({
    projectId,
    coupleNames: displayCoupleNames(project.name),
    weddingDate: project.wedding_date,
    totalBudget,
    tasks,
    budgetItems,
    payments,
    scheduleRows,
    vendors: vendorsWithContact,
    people,
    errors,
  });

  if (isPlanner) {
    return <PlannerDashboard overview={overview} />;
  }

  // Dashboard routing stays business-vs-not. Suggested-path well is personal
  // owners only — collaborators (account === null) must not get it.
  return (
    <CoupleDashboard
      overview={overview}
      isPersonalOwner={account?.kind === "personal"}
    />
  );
}
