import { notFound } from "next/navigation";
import { CoupleDashboard } from "@/components/dashboard/couple-dashboard";
import {
  PlannerDashboard,
  buildLastContactMap,
  computeBudgetCommittedPercent,
  countTasksDueThisWeek,
} from "@/components/dashboard/planner-dashboard";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

type TaskSummary = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  phase: string | null;
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

  const [{ data: project }, { data: tasks }, { data: vendorRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id, title, status, due_date, phase")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("project_vendors")
        .select(
          "id, status, quoted_price, vendors(id, name, category, contact_email, website, ai_overview, last_enriched_at)",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
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

  return (
    <CoupleDashboard
      projectId={projectId}
      coupleNames={project.name}
      weddingDate={project.wedding_date}
      tasks={(tasks ?? []) as TaskSummary[]}
      vendors={vendors}
    />
  );
}
