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
  const onContact =
    pathname === "/contact" || pathname.startsWith("/contact?");
  const inProjectWorkspace = pathname.startsWith("/projects/");

  return (
    <nav className="flex items-center gap-1">
      {!inProjectWorkspace ? (
        <Link
          href="/projects"
          className="relative rounded-[var(--radius-inner)] px-3 py-2 text-sm font-medium text-muted no-underline transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150 hover:bg-well hover:text-ink"
        >
          Home
        </Link>
      ) : null}
      <Link
        href="/account/billing"
        className={cn(
          "relative rounded-[var(--radius-inner)] px-3 py-2 text-sm font-medium no-underline transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150",
          onBilling
            ? "font-semibold text-ink after:scale-x-100"
            : "text-muted hover:bg-well hover:text-ink",
        )}
      >
        Billing
      </Link>
      <Link
        href="/contact"
        className={cn(
          "relative rounded-[var(--radius-inner)] px-3 py-2 text-sm font-medium no-underline transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150",
          onContact
            ? "font-semibold text-ink after:scale-x-100"
            : "text-muted hover:bg-well hover:text-ink",
        )}
      >
        Contact
      </Link>
      <LogoutButton />
    </nav>
  );
}
