import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import { vendorStatusPill } from "@/components/vendors/vendor-status";

type OutreachRow = OutreachVendor & {
  lastContact: string | null;
};

type PlannerDashboardProps = {
  projectId: string;
  tasksDueThisWeek: number;
  vendorsBooked: number;
  vendorsTotal: number;
  budgetCommittedPercent: string;
  vendors: OutreachRow[];
};

function formatQuote(price: number | null) {
  if (price === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatLastContact(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const contactDay = new Date(date);
  contactDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - contactDay.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function vendorNextStep(
  status: OutreachVendor["status"],
  quotedPrice: number | null,
) {
  switch (status) {
    case "to_contact":
      return "Send intro";
    case "contacted":
      return quotedPrice !== null ? "Review quote" : "Follow up";
    case "booked":
      return "—";
    case "declined":
      return "Find alternate";
  }
}

function PlannerOutreachTable({
  projectId,
  vendors,
}: {
  projectId: string;
  vendors: OutreachRow[];
}) {
  return (
    <Card className="px-5 py-[18px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-medium text-ink">Vendor outreach</h2>
        <ButtonLink href={`/projects/${projectId}/vendors`} variant="primary">
          Draft outreach
        </ButtonLink>
      </div>

      {vendors.length === 0 ? (
        <p className="text-[13px] text-ink-muted">
          No vendors on this wedding yet. Search or add vendors to start
          outreach.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-stone px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-ink-muted">
                  Vendor
                </th>
                <th className="border-b border-stone px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-ink-muted">
                  Stage
                </th>
                <th className="border-b border-stone px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-ink-muted">
                  Last contact
                </th>
                <th className="border-b border-stone px-3 pb-2.5 text-right text-xs font-medium tracking-[0.04em] text-ink-muted">
                  Quote
                </th>
                <th className="border-b border-stone px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-ink-muted">
                  Next step
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => {
                const pill = vendorStatusPill(
                  vendor.status,
                  vendor.quoted_price,
                );

                return (
                  <tr
                    key={vendor.id}
                    className="border-b border-stone last:border-b-0 hover:bg-porcelain"
                  >
                    <td className="px-3 py-3 align-middle text-sm">
                      <Link
                        href={`/projects/${projectId}/vendors/${vendor.vendor.id}`}
                        className="font-normal text-ink hover:text-plum-deep"
                      >
                        {vendor.vendor.name}
                      </Link>
                      {vendor.vendor.category ? (
                        <div className="mt-px text-xs text-ink-muted">
                          {vendor.vendor.category}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Pill variant={pill.variant}>{pill.label}</Pill>
                    </td>
                    <td className="tabnum px-3 py-3 align-middle text-sm text-ink">
                      {formatLastContact(vendor.lastContact)}
                    </td>
                    <td className="tabnum px-3 py-3 text-right align-middle text-sm text-ink">
                      {formatQuote(vendor.quoted_price)}
                    </td>
                    <td className="px-3 py-3 align-middle text-sm text-ink">
                      {vendorNextStep(vendor.status, vendor.quoted_price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function PlannerDashboard({
  projectId,
  tasksDueThisWeek,
  vendorsBooked,
  vendorsTotal,
  budgetCommittedPercent,
  vendors,
}: PlannerDashboardProps) {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="px-[18px] py-4">
          <div className="tabnum text-[26px] font-medium text-ink">
            {tasksDueThisWeek}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">
            Tasks due this week
          </div>
        </Card>
        <Card className="px-[18px] py-4">
          <div className="tabnum text-[26px] font-medium text-ink">
            {vendorsBooked} / {vendorsTotal}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">Vendors booked</div>
        </Card>
        <Card className="px-[18px] py-4">
          <div className="tabnum text-[26px] font-medium text-ink">
            {budgetCommittedPercent}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">
            Budget committed
          </div>
        </Card>
      </div>

      <PlannerOutreachTable projectId={projectId} vendors={vendors} />
    </>
  );
}

export function countTasksDueThisWeek(
  tasks: { status: string; due_date: string | null }[],
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return tasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    const due = new Date(task.due_date + "T00:00:00");
    due.setHours(0, 0, 0, 0);
    return due >= today && due <= weekEnd;
  }).length;
}

export function computeBudgetCommittedPercent(vendors: OutreachVendor[]) {
  const withQuotes = vendors.filter((v) => v.quoted_price !== null);
  if (withQuotes.length === 0) return "—";

  const total = withQuotes.reduce((sum, v) => sum + v.quoted_price!, 0);
  const committed = withQuotes
    .filter((v) => v.status === "booked")
    .reduce((sum, v) => sum + v.quoted_price!, 0);

  if (total === 0) return "—";
  return `${Math.round((committed / total) * 100)}%`;
}

export function buildLastContactMap(
  messages: {
    project_vendor_id: string;
    sent_at: string | null;
    updated_at: string | null;
  }[],
) {
  const map = new Map<string, string>();

  for (const message of messages) {
    const at = message.sent_at ?? message.updated_at;
    if (!at) continue;

    const existing = map.get(message.project_vendor_id);
    if (!existing || new Date(at) > new Date(existing)) {
      map.set(message.project_vendor_id, at);
    }
  }

  return map;
}
