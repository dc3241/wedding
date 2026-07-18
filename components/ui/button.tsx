import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonVariant = "default" | "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border text-[14px] font-semibold transition-[background,border-color,color] duration-150 px-4 py-2.5";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  default:
    "border-ring bg-surface text-ink hover:border-muted disabled:opacity-50 disabled:hover:border-ring",
  primary:
    "border-accent bg-accent text-surface hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50",
  secondary:
    "border-ring bg-surface text-ink hover:border-muted disabled:opacity-50 disabled:hover:border-ring",
  ghost:
    "border-transparent bg-transparent text-ink hover:bg-accent-wash disabled:opacity-50 disabled:hover:bg-transparent",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const resolvedVariant = variant === "secondary" ? "default" : variant;

  return (
    <button
      type={type}
      className={cn(baseClasses, buttonVariantClasses[resolvedVariant], className)}
      {...props}
    />
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  className?: string;
};

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  const resolvedVariant = variant === "secondary" ? "default" : variant;

  return (
    <Link
      className={cn(baseClasses, buttonVariantClasses[resolvedVariant], className)}
      {...props}
    />
  );
}
