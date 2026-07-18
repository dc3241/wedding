"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AssistantNavEntry } from "@/components/assistant/AssistantNavEntry";
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
    <nav className="mb-6 flex flex-wrap items-center gap-1 border-b border-hairline pb-3 md:flex-nowrap">
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
              "rounded-full px-3 py-1.5 text-sm text-muted no-underline transition-[color,background] duration-150 hover:text-ink",
              active && "bg-accent text-surface",
            )}
          >
            {label}
          </Link>
        );
      })}
      <AssistantNavEntry projectId={projectId} />
    </nav>
  );
}
