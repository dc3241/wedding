"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AccountKind } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { projectTabHref, tabsForAccountKind } from "@/lib/project-tabs";

export function ProjectWorkspaceNav({
  projectId,
  accountKind,
}: {
  projectId: string;
  accountKind: AccountKind;
}) {
  const pathname = usePathname();
  const tabs = tabsForAccountKind(accountKind);

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-stone pb-3">
      {tabs.map(({ label, segment }) => {
        const href = projectTabHref(projectId, segment);
        const active =
          segment === ""
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={segment || "overview"}
            href={href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm text-ink-muted no-underline transition-[color,background] duration-150 hover:text-ink",
              active && "bg-plum-tint text-plum-deep",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
