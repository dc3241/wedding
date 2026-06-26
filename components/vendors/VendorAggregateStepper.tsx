import {
  VENDOR_PIPELINE_STEPS,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { cn } from "@/lib/cn";

function vendorPipelineStep(vendor: OutreachVendor) {
  if (vendor.status === "booked") return 3;
  if (vendor.status === "contacted" && vendor.quoted_price !== null) return 2;
  if (vendor.status === "contacted") return 1;
  if (vendor.status === "to_contact") return 0;
  return 0;
}

export function VendorAggregateStepper({
  vendors,
  className,
}: {
  vendors: OutreachVendor[];
  className?: string;
}) {
  if (vendors.length === 0) return null;

  let litThrough = -1;
  for (const vendor of vendors) {
    litThrough = Math.max(litThrough, vendorPipelineStep(vendor));
  }

  return (
    <div className={cn("flex items-center", className)}>
      {VENDOR_PIPELINE_STEPS.map((step, index) => {
        const lit = index <= litThrough;
        const isLast = index === VENDOR_PIPELINE_STEPS.length - 1;

        return (
          <div
            key={step.id}
            className={cn("flex items-center gap-2.5", !isLast && "flex-1")}
          >
            <span
              className={cn(
                "size-[9px] shrink-0 rounded-full",
                lit ? "bg-plum" : "bg-stone",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "text-xs",
                lit ? "font-medium text-plum-deep" : "text-ink-muted",
              )}
            >
              {step.label}
            </span>
            {!isLast ? <span className="h-px flex-1 bg-stone" aria-hidden /> : null}
          </div>
        );
      })}
    </div>
  );
}
