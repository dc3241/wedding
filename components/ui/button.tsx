import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonVariant = "default" | "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

/** Ghost pill = `default`; accent pill = `primary`. Shared by marketing + app. */
const baseClasses =
  "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] text-[14px] font-semibold transition-[background,border-color,color,box-shadow,transform,filter] duration-150 px-5 py-2.5 motion-reduce:transition-none";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  default:
    "border-hairline bg-surface text-ink hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-hairline disabled:hover:text-ink",
  primary:
    "border-accent bg-accent text-surface shadow-raised hover:-translate-y-px hover:brightness-[0.94] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100 motion-reduce:hover:translate-y-0",
  secondary:
    "border-hairline bg-surface text-ink hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-hairline disabled:hover:text-ink",
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
