import { notFound } from "next/navigation";
import { CoupleDashboard } from "@/components/dashboard/couple-dashboard";
import {
  PlannerDashboard,
  buildLastContactMap,
  computeBudgetCommittedPercent,
  countTasksDueThisWeek,
} from "@/components/dashboard/planner-dashboard";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import {
  sumPartySize,
  sumPartySizeByStatus,
  type Guest,
} from "./guests/types";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

type TaskSummary = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  phase: string | null;
  position: number;
};

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
    { data: project },
    { data: tasks },
    { data: vendorRows },
    { data: budgetItemRows },
    { data: guestRows },
    { data: websiteRow },
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
        "id, category, label, planned_amount, actual_amount, notes, project_vendor_id",
      )
      .eq("project_id", projectId)
      .order("category", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true }),
    supabase
      .from("guests")
      .select("id, party_size, rsvp_status")
      .eq("project_id", projectId),
    supabase
      .from("wedding_websites")
      .select("id, published")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!project) {
    notFound();
  }

  const vendors: OutreachVendor[] = (vendorRows ?? [])
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

  if (isPlanner) {
    const vendorIds = vendors.map((vendor) => vendor.id);
    const { data: messageRows } =
      vendorIds.length > 0
        ? await supabase
            .from("outreach_messages")
            .select("project_vendor_id, sent_at, updated_at")
            .in("project_vendor_id", vendorIds)
        : { data: [] };

    const lastContactByVendor = buildLastContactMap(messageRows ?? []);
    const taskList = (tasks ?? []) as TaskSummary[];
    const vendorsBooked = vendors.filter((v) => v.status === "booked").length;

    return (
      <PlannerDashboard
        projectId={projectId}
        tasksDueThisWeek={countTasksDueThisWeek(taskList)}
        vendorsBooked={vendorsBooked}
        vendorsTotal={vendors.length}
        budgetCommittedPercent={computeBudgetCommittedPercent(vendors)}
        vendors={vendors.map((vendor) => ({
          ...vendor,
          lastContact: lastContactByVendor.get(vendor.id) ?? null,
        }))}
      />
    );
  }

  const totalBudget =
    project.total_budget === null || project.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const budgetItems = (budgetItemRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    planned_amount: Number(row.planned_amount),
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    notes: row.notes,
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const guests = (guestRows ?? []) as Pick<
    Guest,
    "id" | "party_size" | "rsvp_status"
  >[];

  const guestStats = {
    invited: sumPartySize(guests as Guest[]),
    attending: sumPartySizeByStatus(guests as Guest[], "attending"),
    declined: sumPartySizeByStatus(guests as Guest[], "declined"),
    pending: sumPartySizeByStatus(guests as Guest[], "pending"),
    householdCount: guests.length,
  };

  const website = websiteRow
    ? { published: Boolean(websiteRow.published) }
    : null;

  return (
    <CoupleDashboard
      projectId={projectId}
      coupleNames={project.name}
      weddingDate={project.wedding_date}
      tasks={(tasks ?? []) as TaskSummary[]}
      vendors={vendors}
      totalBudget={totalBudget}
      budgetItems={budgetItems}
      guestStats={guestStats}
      website={website}
    />
  );
}
