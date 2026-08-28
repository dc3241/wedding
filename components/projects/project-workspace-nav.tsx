"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AssistantNavEntry } from "@/components/assistant/AssistantNavEntry";
import type { AccountKind } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { projectTabHref, tabsForAccountKind } from "@/lib/project-tabs";

export function ProjectWorkspaceNav({
  projectId,
  accountKind,
  projectMemberRole = null,
}: {
  projectId: string;
  /** Null = no account (invited member). Do not collapse to `"personal"`. */
  accountKind: AccountKind | null;
  /** CAL-04 / CAL-06: used only for Calendar when kind is null. */
  projectMemberRole?: string | null;
}) {
  const pathname = usePathname();
  const tabs = tabsForAccountKind(accountKind, projectMemberRole);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = activeRef.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;

    const elRect = el.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    if (elRect.left < scrollerRect.left || elRect.right > scrollerRect.right) {
      el.scrollIntoView({ inline: "nearest", block: "nearest" });
    }
  }, [pathname]);

  return (
    <nav className="mb-6 flex items-center gap-1 border-b border-hairline pb-3">
      <div
        ref={scrollerRef}
        className="min-w-0 flex-1 overflow-x-auto md:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-nowrap items-center gap-1">
          {tabs.map(({ label, segment }) => {
            const href = projectTabHref(projectId, segment);
            const active =
              segment === ""
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={segment || "overview"}
                ref={active ? activeRef : undefined}
                href={href}
                className={cn(
                  "relative max-md:shrink-0 max-md:scroll-mx-3 max-md:whitespace-nowrap rounded-[var(--radius-inner)] px-3 py-1.5 text-sm text-muted no-underline transition-[color,background] duration-150 after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150 hover:text-ink",
                  active && "font-semibold text-ink after:scale-x-100",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="shrink-0">
        <AssistantNavEntry projectId={projectId} />
      </div>
    </nav>
  );
}
