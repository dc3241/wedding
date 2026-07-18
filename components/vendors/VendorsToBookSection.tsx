import { Pill, type PillVariant } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

export type VendorTargetRow = {
  id: string;
  category: string;
  note: string | null;
  status: "needed" | "booked" | "skipped";
};

const STATUS_LABELS: Record<VendorTargetRow["status"], string> = {
  needed: "To book",
  booked: "Booked",
  skipped: "Skipped",
};

const STATUS_VARIANTS: Record<VendorTargetRow["status"], PillVariant> = {
  needed: "accent",
  booked: "sage",
  skipped: "default",
};

export function VendorsToBookSection({
  targets,
}: {
  targets: VendorTargetRow[];
}) {
  if (targets.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Vendors to book
      </p>
      <Card className="overflow-hidden px-3.5 py-3.5">
        <ul>
          {targets.map((target) => (
            <li
              key={target.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">
                  {vendorCategoryLabel(target.category)}
                </p>
                {target.note ? (
                  <p className="mt-1 text-[13px] text-muted">{target.note}</p>
                ) : null}
              </div>
              <Pill variant={STATUS_VARIANTS[target.status]}>
                {STATUS_LABELS[target.status]}
              </Pill>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
