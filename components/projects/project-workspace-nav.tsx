"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [overflow, setOverflow] = useState({ left: false, right: false });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateOverflow = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      const maxScroll = scrollWidth - clientWidth;
      setOverflow({
        left: scrollLeft > 1,
        right: maxScroll - scrollLeft > 1,
      });
    };

    updateOverflow();
    scroller.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(scroller);
    const inner = scroller.firstElementChild;
    if (inner) observer.observe(inner);

    return () => {
      scroller.removeEventListener("scroll", updateOverflow);
      observer.disconnect();
    };
  }, [tabs.length]);

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
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollerRef}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    "relative shrink-0 scroll-mx-3 whitespace-nowrap rounded-[var(--radius-inner)] px-3 py-1.5 text-sm text-muted no-underline transition-[color,background] duration-150 after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150 hover:text-ink",
                    active && "font-semibold text-ink after:scale-x-100",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-canvas to-transparent transition-opacity duration-150",
            overflow.left ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-canvas to-transparent transition-opacity duration-150",
            overflow.right ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      <div className="shrink-0">
        <AssistantNavEntry projectId={projectId} />
      </div>
    </nav>
  );
}
