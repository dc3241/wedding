import {
  IN_FLIGHT_STATUSES,
  OUTREACH_STATUS_HEADING,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";

/** Stage counts for the Outreach section — replaces the decorative aggregate dots. */
export function VendorAggregateStepper({
  vendors,
}: {
  vendors: OutreachVendor[];
  className?: string;
}) {
  if (vendors.length === 0) return null;

  const parts = IN_FLIGHT_STATUSES.map((status) => {
    const n = vendors.filter((v) => v.status === status).length;
    if (n === 0) return null;
    const label = OUTREACH_STATUS_HEADING[status].toLowerCase();
    return `${n} ${label}`;
  }).filter((part): part is string => part != null);

  if (parts.length === 0) return null;

  return (
    <p className="text-[14px] font-medium text-muted">
      {parts.join(" · ")}
    </p>
  );
}
