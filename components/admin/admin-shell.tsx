"use client";

import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/cn";
import { acquireScrollLock, releaseScrollLock } from "@/lib/scroll-lock";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Dark collapsible icon-rail sidebar — deliberately different visual
 * treatment from PlannerProjectSidebar's light card style, per Dom's
 * explicit direction (RevLifter reference). Colors still come from the
 * same token set (bg-ink / text-canvas / accent), so it's a different
 * shape, not a different design system.
 *
 * ADMIN-AUD-01: shared top block, then Couples / Venues & planners groups.
 * Content queue and generate+rate Ideation stay top-level (Open decisions
 * #2a and #5). Collapse + mobile drawer stay in this file.
 */

type NavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: ReactNode;
};

type NavBlock =
  | { kind: "items"; items: NavItem[] }
  | { kind: "group"; label: string; items: NavItem[] };

const overviewIcon = <path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5M8 17v-5h4v5" />;
const scheduleIcon = (
  <>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
    <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
  </>
);
const performanceIcon = <path d="M4 17V11M10 17V4M16 17v-7M2.5 17h15" />;
const mediaIcon = (
  <>
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <circle cx="7.5" cy="8.5" r="1.3" />
    <path d="M4 15l4-4 3 3 2-2 3 3" />
  </>
);
const queueIcon = (
  <>
    <rect x="5" y="4" width="12" height="13" rx="2" />
    <path d="M3 7v9.5A1.5 1.5 0 0 0 4.5 18H15" />
  </>
);
const ideationIcon = (
  <path d="M10 2a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9ZM7.5 15h5M8.5 17.5h3" />
);
const bankIcon = <path d="M10 3 3 7l7 4 7-4-7-4ZM3 11l7 4 7-4" />;
const imageIcon = (
  <>
    <path d="M4 16 14 6" />
    <path d="M13 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
    <path d="M5 13l.6 1.4L7 15l-1.4.6L5 17l-.6-1.4L3 15l1.4-.6Z" />
  </>
);
const automationsIcon = (
  <path d="M11 2 4.5 11.5H9L8 18l6.5-9.5H10l1-6.5Z" />
);
const outreachIcon = (
  <>
    <path d="M17 3 3 9.5l6 2 2 6L17 3Z" />
    <path d="M9 11.5 17 3" />
  </>
);

const NAV: NavBlock[] = [
  {
    kind: "items",
    items: [
      { href: "/admin", label: "Overview", tooltip: "Overview", icon: overviewIcon },
      { href: "/admin/schedule", label: "Schedule", tooltip: "Schedule", icon: scheduleIcon },
      { href: "/admin/performance", label: "Performance", tooltip: "Performance", icon: performanceIcon },
      { href: "/admin/media", label: "Media library", tooltip: "Media library", icon: mediaIcon },
      { href: "/admin/content-queue", label: "Content queue", tooltip: "Content queue", icon: queueIcon },
      { href: "/admin/ideation", label: "Ideation", tooltip: "Ideation", icon: ideationIcon },
    ],
  },
  {
    kind: "group",
    label: "Couples",
    items: [
      { href: "/admin/couples/pillars", label: "Content pillars", tooltip: "Couples content pillars", icon: ideationIcon },
      { href: "/admin/couples/bank", label: "Content bank", tooltip: "Couples content bank", icon: bankIcon },
      { href: "/admin/couples/image", label: "Image generator", tooltip: "Image generator", icon: imageIcon },
      { href: "/admin/couples/automations", label: "Automations", tooltip: "Couples automations", icon: automationsIcon },
    ],
  },
  {
    kind: "group",
    label: "Venues & planners",
    items: [
      { href: "/admin/planner/pillars", label: "Content pillars", tooltip: "Venues & planners content pillars", icon: ideationIcon },
      { href: "/admin/planner/bank", label: "Content bank", tooltip: "Venues & planners content bank", icon: bankIcon },
      { href: "/admin/planner/outreach", label: "Venue outreach", tooltip: "Venue outreach", icon: outreachIcon },
      { href: "/admin/planner/automations", label: "Automations", tooltip: "Venues & planners automations", icon: automationsIcon },
    ],
  },
];

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-[19px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

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

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative mb-0.5 flex items-center gap-3 rounded-[var(--radius-inner)] px-2.5 py-2.5 text-[15px] font-medium whitespace-nowrap text-[#C9BFC4] hover:bg-white/8 hover:text-canvas",
        collapsed && "md:justify-center",
        active && "bg-white/12 font-semibold text-canvas",
      )}
    >
      <span className={active ? "text-accent" : undefined}>
        <NavIcon>{item.icon}</NavIcon>
      </span>
      <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-20 -translate-y-1/2 rounded-lg bg-[#3D2430] px-[11px] py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-canvas shadow-raised",
          "invisible opacity-0 transition-opacity duration-100",
          collapsed && "md:group-hover:visible md:group-hover:opacity-100",
        )}
      >
        {item.tooltip}
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
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
    <div className="flex min-h-screen">
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
          <Wordmark
            className={cn(
              "h-[19px] w-auto text-canvas",
              collapsed && "md:hidden",
            )}
          />
          {collapsed ? (
            <span className="hidden font-sans text-[17px] font-extrabold text-canvas md:block">
              F
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Collapse menu"
            className={cn(
              "hidden size-[26px] shrink-0 items-center justify-center rounded-lg bg-white/8 text-canvas hover:bg-white/16 md:flex",
              collapsed && "md:absolute md:top-4 md:right-1/2 md:translate-x-1/2",
            )}
          >
            <span className={cn("transition-transform", collapsed && "rotate-180")}>
              <CollapseIcon />
            </span>
          </button>
        </div>

        <nav className="flex flex-1 flex-col">
          {NAV.map((block, i) => (
            <div key={block.kind === "group" ? block.label : "top"} className={cn(i > 0 && "mt-1")}>
              {i > 0 ? (
                <div className="mx-2 my-2 h-px shrink-0 bg-white/10" />
              ) : null}
              {block.kind === "group" ? (
                <div
                  className={cn(
                    "px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-[#948B90] uppercase",
                    collapsed && "md:hidden",
                  )}
                >
                  {block.label}
                </div>
              ) : null}
              {block.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[color:var(--ink)]/35 md:hidden"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-canvas px-4 py-3.5 md:justify-end md:px-7 md:py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
            className="flex size-[38px] items-center justify-center rounded-[var(--radius-inner)] text-ink hover:bg-well md:hidden"
          >
            <MenuIcon />
          </button>
          <span className="rounded-[var(--radius-pill)] bg-accent-wash px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-accent">
            First Look Admin
          </span>
        </div>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-5 pb-16 md:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
