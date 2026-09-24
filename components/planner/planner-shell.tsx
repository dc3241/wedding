"use client";

import { AccountBrandMark } from "@/components/branding/account-brand-mark";
import { PlannerProjectSidebar } from "@/components/planner/planner-project-sidebar";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
import { Wordmark } from "@/components/brand/Wordmark";
import { brandAccentStyle } from "@/lib/branding/accent-style";
import type { ProjectBranding } from "@/lib/branding/types";
import type { AccountPlan } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { acquireScrollLock, releaseScrollLock } from "@/lib/scroll-lock";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Dark collapsible icon-rail — same Soft stack treatment as AdminShell
 * (bg-ink / pill active / accent icon). Branding gate unchanged: only
 * venue + white_label swaps logo/accent; planners keep First Look.
 */

function CollapseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.5 4 7 10l5.5 6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

function brandInitial(branding: ProjectBranding | null) {
  const name = branding?.brandName?.trim();
  if (name) return name.charAt(0).toUpperCase();
  return "F";
}

export function PlannerShell({
  children,
  projects,
  branding = null,
  plan = "planner",
}: {
  children: ReactNode;
  projects: SidebarProject[];
  branding?: ProjectBranding | null;
  plan?: AccountPlan;
}) {
  const style = brandAccentStyle(branding);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (mobileOpen) {
      acquireScrollLock();
      return () => releaseScrollLock();
    }
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen" style={style}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(250px,80vw)] flex-shrink-0 flex-col bg-ink px-3 py-4 text-canvas transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed
            ? "md:w-[68px] md:overflow-visible"
            : "overflow-x-hidden overflow-y-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "mb-4 flex flex-shrink-0 items-center px-1 pt-1 pb-2",
            collapsed ? "md:justify-center" : "justify-between",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "min-w-0 no-underline",
              collapsed && "md:hidden",
            )}
            aria-label="Dashboard"
          >
            {branding ? (
              <AccountBrandMark branding={branding} onDark />
            ) : (
              <Wordmark className="h-[19px] w-auto text-canvas" />
            )}
          </Link>
          {collapsed ? (
            <Link
              href="/dashboard"
              className="hidden font-sans text-[17px] font-extrabold text-canvas no-underline md:block"
              aria-label="Dashboard"
            >
              {brandInitial(branding)}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className={cn(
              "hidden size-[26px] shrink-0 items-center justify-center rounded-lg bg-white/8 text-canvas hover:bg-white/16 md:flex",
              collapsed &&
                "md:absolute md:top-4 md:right-1/2 md:translate-x-1/2",
            )}
          >
            <span
              className={cn("transition-transform", collapsed && "rotate-180")}
            >
              <CollapseIcon />
            </span>
          </button>
        </div>

        <PlannerProjectSidebar
          projects={projects}
          plan={plan}
          collapsed={collapsed}
        />
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[color:var(--ink)]/35 md:hidden"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-hairline bg-canvas px-4 py-3.5 md:hidden md:px-7 md:py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
            className="flex size-[38px] items-center justify-center rounded-[var(--radius-inner)] text-ink hover:bg-well"
          >
            <MenuIcon />
          </button>
          <Link href="/dashboard" className="min-w-0 no-underline" aria-label="Dashboard">
            {branding ? (
              <AccountBrandMark branding={branding} />
            ) : (
              <Wordmark className="h-7 w-auto text-ink" />
            )}
          </Link>
        </div>

        <main className="mx-auto w-full max-w-[1180px] min-w-0 flex-1 px-4 pt-5 pb-16 md:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
