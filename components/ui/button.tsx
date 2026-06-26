import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonVariant = "default" | "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex cursor-pointer items-center justify-center rounded border text-sm font-medium transition-[background,border-color] duration-150 px-[18px] py-[9px]";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  default:
    "border-stone bg-surface text-ink hover:border-ink-muted disabled:opacity-50 disabled:hover:border-stone",
  primary:
    "border-plum bg-plum text-surface hover:border-plum-deep hover:bg-plum-deep disabled:opacity-50 disabled:hover:border-plum disabled:hover:bg-plum",
  secondary:
    "border-stone bg-surface text-ink hover:border-ink-muted disabled:opacity-50 disabled:hover:border-stone",
  ghost:
    "border-transparent bg-transparent text-ink hover:bg-plum-tint disabled:opacity-50 disabled:hover:bg-transparent",
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
