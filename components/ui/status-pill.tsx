import { Pill, type PillVariant } from "@/components/ui/pill";
import type { HTMLAttributes } from "react";

type StatusPillVariant = Extract<PillVariant, "sage" | "clay" | "rosewood">;

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  variant: StatusPillVariant;
};

/** @deprecated Use `Pill` instead. */
export function StatusPill({ variant, ...props }: StatusPillProps) {
  return <Pill variant={variant} {...props} />;
}
