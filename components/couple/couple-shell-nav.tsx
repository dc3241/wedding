"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function CoupleShellNav() {
  const pathname = usePathname();
  const onBilling =
    pathname === "/account/billing" ||
    pathname.startsWith("/account/billing?");

  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/account/billing"
        className={cn(
          "rounded-[var(--radius-inner)] px-3 py-2 text-sm font-medium no-underline transition-colors",
          onBilling
            ? "bg-accent-wash text-accent"
            : "text-muted hover:bg-well hover:text-ink",
        )}
      >
        Billing
      </Link>
      <LogoutButton />
    </nav>
  );
}
