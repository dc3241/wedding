"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from "react";

type TopbarProps = HTMLAttributes<HTMLElement>;

export function Topbar({ className, children, ...props }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas px-[18px] py-3.5 md:px-8 md:py-[18px]",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}

type WordmarkProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Wordmark({ className, children = "First Look", ...props }: WordmarkProps) {
  return (
    <div
      className={cn(
        "font-display flex items-center gap-2.5 text-[25px] tracking-[0.01em] text-ink",
        className,
      )}
      {...props}
    >
      <span
        className="size-[9px] shrink-0 rounded-full bg-accent"
        aria-hidden
      />
      {children}
    </div>
  );
}

type NavLinksProps = HTMLAttributes<HTMLElement>;

export function NavLinks({ className, children, ...props }: NavLinksProps) {
  return (
    <nav
      className={cn("hidden items-center gap-1 md:flex", className)}
      {...props}
    >
      {children}
    </nav>
  );
}

type NavLinkProps = ComponentProps<typeof Link> & {
  active?: boolean;
};

export function NavLink({ active, className, ...props }: NavLinkProps) {
  return (
    <Link
      className={cn(
        "rounded-full px-3 py-1.5 text-sm text-muted no-underline transition-[color,background] duration-150 hover:text-ink",
        active && "bg-accent-wash text-accent",
        className,
      )}
      {...props}
    />
  );
}

type SegmentedToggleProps = HTMLAttributes<HTMLDivElement>;

export function SegmentedToggle({
  className,
  children,
  ...props
}: SegmentedToggleProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex rounded-full border border-ring bg-surface p-[3px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type SegmentedToggleItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function SegmentedToggleItem({
  active,
  className,
  type = "button",
  ...props
}: SegmentedToggleItemProps) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      className={cn(
        "cursor-pointer rounded-full border-none bg-transparent px-3.5 py-1.5 text-[13px] font-medium text-muted transition-[color,background] duration-150",
        active && "bg-accent text-surface",
        className,
      )}
      {...props}
    />
  );
}
