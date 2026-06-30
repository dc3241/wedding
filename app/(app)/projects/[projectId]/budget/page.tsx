import Link from "next/link";
import { AddBudgetItemForm } from "./AddBudgetItemForm";
import { BudgetItemRow } from "./BudgetItemRow";
import { BudgetSummary } from "./BudgetSummary";
import {
  formatCurrency,
  sumPlanned,
  sumVendorCosts,
  type BookedVendorCost,
  type BudgetItem,
} from "./types";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { dataRowClass, sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const accountKind = account?.kind ?? "personal";
  const stackClass = sectionStackClass(accountKind);
  const rowClass = dataRowClass(accountKind);

  const [{ data: project }, { data: items }, { data: vendorRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("total_budget")
        .eq("id", projectId)
        .single(),
      supabase
        .from("budget_items")
        .select("id, category, label, planned_amount, actual_amount, notes")
        .eq("project_id", projectId)
        .order("category", { ascending: true, nullsFirst: false })
        .order("label", { ascending: true }),
      supabase
        .from("project_vendors")
        .select("id, quoted_price, vendors(name, category)")
        .eq("project_id", projectId)
        .eq("status", "booked")
        .not("quoted_price", "is", null)
        .order("created_at", { ascending: true }),
    ]);

  const target =
    project?.total_budget === null || project?.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const budgetItems: BudgetItem[] = (items ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    planned_amount: Number(row.planned_amount),
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    notes: row.notes,
  }));

  const bookedVendors: BookedVendorCost[] = (vendorRows ?? []).flatMap(
    (row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor || row.quoted_price === null) return [];
      return [
        {
          id: row.id,
          quoted_price: Number(row.quoted_price),
          vendor: {
            name: vendor.name,
            category: vendor.category,
          },
        },
      ];
    },
  );

  const itemsPlanned = sumPlanned(budgetItems);
  const vendorCommitted = sumVendorCosts(bookedVendors);
  const allocated = itemsPlanned + vendorCommitted;

  return (
    <div className={stackClass}>
      <PageHeader title="Wedding budget" eyebrow="Budget" />

      <BudgetSummary
        projectId={projectId}
        target={target}
        allocated={allocated}
      />

      <section>
        <div className="mb-[18px]">
          <Eyebrow>Vendor costs</Eyebrow>
          <p className="mt-1 text-[13px] text-ink-muted">
            Booked vendors with quotes from the{" "}
            <Link
              href={`/projects/${projectId}/vendors`}
              className="text-plum hover:text-plum-deep"
            >
              Vendors
            </Link>{" "}
            tab. These roll into Allocated automatically.
          </p>
        </div>

        {bookedVendors.length === 0 ? (
          <p className="px-1 text-[13px] text-ink-muted">
            No booked vendors with quotes yet. Mark a vendor as booked on the
            Vendors tab to see their cost here.
          </p>
        ) : (
          <Card className="px-5 py-3">
            <ul className="divide-y divide-stone">
              {bookedVendors.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <div className="text-[15px] text-ink">{row.vendor.name}</div>
                    {row.vendor.category ? (
                      <div className="text-[13px] text-ink-muted">
                        {row.vendor.category}
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[15px] font-medium tabular-nums text-ink">
                    {formatCurrency(row.quoted_price)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-stone pt-3">
              <span className="text-[13px] font-medium text-ink-muted">
                Subtotal
              </span>
              <span className="text-[15px] font-medium tabular-nums text-ink">
                {formatCurrency(vendorCommitted)}
              </span>
            </div>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-[18px]">
          <Eyebrow>Other budget items</Eyebrow>
          <p className="mt-1 text-[13px] text-ink-muted">
            Manual line items for non-vendor expenses like attire, favors, and
            misc.
          </p>
        </div>

        <AddBudgetItemForm projectId={projectId} />

        {budgetItems.length === 0 ? (
          <p className="mt-5 px-1 text-[13px] text-ink-muted">
            No other budget items yet. Add one above for expenses not tracked
            on the Vendors tab.
          </p>
        ) : (
          <Card className="mt-5 overflow-x-auto px-5 py-3">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-stone text-[12px] font-medium tracking-[0.06em] text-ink-muted">
                  <th className="pb-2 pr-3 font-medium">Category</th>
                  <th className="pb-2 pr-3 font-medium">Label</th>
                  <th className="pb-2 pr-3 text-right font-medium">Planned</th>
                  <th className="pb-2 pr-3 text-right font-medium">Actual</th>
                  <th className="pb-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone">
                {budgetItems.map((item) => (
                  <BudgetItemRow
                    key={item.id}
                    item={item}
                    rowClass={rowClass}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone">
                  <td
                    colSpan={2}
                    className="pt-3 text-[13px] font-medium text-ink-muted"
                  >
                    Subtotal
                  </td>
                  <td className="pt-3 text-right text-[15px] font-medium tabular-nums text-ink">
                    {formatCurrency(itemsPlanned)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
