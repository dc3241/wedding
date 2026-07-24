import { Pill, type PillVariant } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";

export type VendorPipelineStatus = OutreachVendor["status"];

export const VENDOR_STATUS_LABEL: Record<VendorPipelineStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  replied: "Replied",
  booked: "Booked",
  declined: "Declined",
};

export function vendorStatusPill(
  status: string,
  _quotedPrice: number | null = null,
): { variant: PillVariant; label: string } {
  switch (status as VendorPipelineStatus) {
    case "booked":
      return { variant: "sage", label: "Booked" };
    case "declined":
      return { variant: "rosewood", label: "Declined" };
    case "replied":
      return { variant: "clay", label: "Replied" };
    case "contacted":
      return { variant: "default", label: "Contacted" };
    default:
      return { variant: "default", label: "To contact" };
  }
}

/** @deprecated Use vendorStatusPill instead. */
export function vendorStatusVariant(
  status: string,
): "sage" | "clay" | "rosewood" {
  const { variant } = vendorStatusPill(status);
  if (variant === "default" || variant === "plum" || variant === "accent")
    return "clay";
  return variant;
}

/** @deprecated Use vendorStatusPill instead. */
export function vendorStatusLabel(status: string) {
  return vendorStatusPill(status).label;
}

export function VendorStatusPill({
  status,
  quotedPrice = null,
  onClick,
  disabled,
  className,
}: {
  status: string;
  quotedPrice?: number | null;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { variant, label } = vendorStatusPill(status, quotedPrice);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`Status: ${label}. Click to change.`}
        className={cn(
          "shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <Pill variant={variant}>{label}</Pill>
      </button>
    );
  }

  return (
    <Pill variant={variant} className={cn("shrink-0", className)}>
      {label}
    </Pill>
  );
}

/** @deprecated Use VendorStatusPill instead. */
export function VendorStatusButton({
  status,
  onClick,
  disabled,
  className,
}: {
  status: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <VendorStatusPill
      status={status}
      onClick={onClick}
      disabled={disabled}
      className={className}
    />
  );
}
