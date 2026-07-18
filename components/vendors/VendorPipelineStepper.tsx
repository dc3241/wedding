import {
  pipelineStepState,
  VENDOR_PIPELINE_STEPS,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { cn } from "@/lib/cn";

export function VendorPipelineStepper({
  status,
  className,
}: {
  status: OutreachVendor["status"];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "flex items-center",
        status === "declined" && "opacity-60",
        className,
      )}
      aria-label="Vendor outreach pipeline"
    >
      {VENDOR_PIPELINE_STEPS.map((step, index) => {
        const state = pipelineStepState(status, index);
        const lit = state === "complete" || state === "current";
        const isLast = index === VENDOR_PIPELINE_STEPS.length - 1;

        return (
          <li
            key={step.id}
            className={cn("flex items-center gap-2.5", !isLast && "flex-1")}
          >
            <span
              className={cn(
                "size-[9px] shrink-0 rounded-full",
                lit ? "bg-accent" : "bg-ring",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "text-[13px]",
                lit ? "font-semibold text-accent" : "font-medium text-muted",
              )}
            >
              {step.label}
            </span>
            {!isLast ? (
              <span className="h-px flex-1 bg-hairline" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
