import { Pill, type PillVariant } from "@/components/ui/pill";
import { Eyebrow } from "@/components/ui/eyebrow";

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
  needed: "plum",
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
    <section className="mt-12">
      <div className="mb-[18px]">
        <Eyebrow>Vendors to book</Eyebrow>
      </div>
      <div className="divide-y divide-stone rounded-lg border border-stone bg-surface">
        {targets.map((target) => (
          <div
            key={target.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-[15px] text-ink">{target.category}</p>
              {target.note ? (
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {target.note}
                </p>
              ) : null}
            </div>
            <Pill variant={STATUS_VARIANTS[target.status]}>
              {STATUS_LABELS[target.status]}
            </Pill>
          </div>
        ))}
      </div>
    </section>
  );
}
