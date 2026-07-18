import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { StatCard } from "@/components/ui/stat-card";
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
    <Card className="px-6 py-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Vendor outreach
        </h2>
        <ButtonLink href={`/projects/${projectId}/vendors`} variant="primary">
          Draft outreach
        </ButtonLink>
      </div>

      {vendors.length === 0 ? (
        <EmptyState>
          No vendors on this wedding yet. Search or add vendors to start
          outreach.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse">
            <thead>
              <tr>
                {(
                  [
                    ["Vendor", "left"],
                    ["Stage", "left"],
                    ["Last contact", "left"],
                    ["Quote", "right"],
                    ["Next step", "left"],
                  ] as const
                ).map(([label, align]) => (
                  <th
                    key={label}
                    className={
                      align === "right"
                        ? "border-b border-hairline px-3 pb-2.5 text-right text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
                        : "border-b border-hairline px-3 pb-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
                    }
                  >
                    {label}
                  </th>
                ))}
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
                    className="border-b border-hairline last:border-b-0 hover:bg-well"
                  >
                    <td className="px-3 py-3 align-middle text-[14px]">
                      <Link
                        href={`/projects/${projectId}/vendors/${vendor.vendor.id}`}
                        className="font-medium text-ink hover:text-accent"
                      >
                        {vendor.vendor.name}
                      </Link>
                      {vendor.vendor.category ? (
                        <div className="mt-0.5 text-[12px] text-muted">
                          {vendor.vendor.category}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Pill variant={pill.variant}>{pill.label}</Pill>
                    </td>
                    <td className="px-3 py-3 align-middle text-[14px] tabular-nums text-ink">
                      {formatLastContact(vendor.lastContact)}
                    </td>
                    <td className="px-3 py-3 text-right align-middle text-[14px] tabular-nums text-ink">
                      {formatQuote(vendor.quoted_price)}
                    </td>
                    <td className="px-3 py-3 align-middle text-[14px] text-ink">
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard value={tasksDueThisWeek} label="Tasks due this week" />
        <StatCard
          value={`${vendorsBooked} / ${vendorsTotal}`}
          label="Vendors booked"
        />
        <StatCard value={budgetCommittedPercent} label="Budget committed" />
      </div>

      <PlannerOutreachTable projectId={projectId} vendors={vendors} />
    </div>
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
