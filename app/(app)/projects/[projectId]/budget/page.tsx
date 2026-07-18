import { BudgetBoard } from "./BudgetBoard";
import {
  computeBudgetAggregates,
  type ProjectVendorOption,
} from "@/lib/budget-aggregates";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [{ data: project }, { data: items }, { data: vendorRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("name, wedding_date, total_budget")
        .eq("id", projectId)
        .single(),
      supabase
        .from("budget_items")
        .select(
          "id, category, label, planned_amount, actual_amount, notes, project_vendor_id",
        )
        .eq("project_id", projectId)
        .order("category", { ascending: true, nullsFirst: false })
        .order("label", { ascending: true }),
      supabase
        .from("project_vendors")
        .select("id, quoted_price, status, vendors(name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
    ]);

  // Existing coercion — do not "fix"; PostgREST numerics arrive as strings.
  const totalBudget =
    project?.total_budget === null || project?.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const budgetItems = (items ?? []).map((row) => ({
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

  const projectVendors: ProjectVendorOption[] = (vendorRows ?? []).flatMap(
    (row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor) return [];
      return [
        {
          id: row.id,
          name: vendor.name,
          quoted_price:
            row.quoted_price === null || row.quoted_price === undefined
              ? null
              : Number(row.quoted_price),
          status: row.status,
        },
      ];
    },
  );

  const aggregates = computeBudgetAggregates(
    budgetItems,
    totalBudget,
    projectVendors,
  );

  return (
    <div className={stackClass}>
      <BudgetBoard
        projectId={projectId}
        projectName={project?.name ?? "Your wedding"}
        weddingDate={project?.wedding_date ?? null}
        aggregates={aggregates}
        projectVendors={projectVendors}
      />
    </div>
  );
}
