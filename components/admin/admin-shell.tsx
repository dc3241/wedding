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
 */

const NAV_ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: (
      <path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5M8 17v-5h4v5" />
    ),
  },
  {
    href: "/admin/schedule",
    label: "Schedule",
    icon: (
      <>
        <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
        <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
      </>
    ),
  },
  {
    href: "/admin/bank",
    label: "Content bank",
    icon: <path d="M10 3 3 7l7 4 7-4-7-4ZM3 11l7 4 7-4" />,
  },
  {
    href: "/admin/automations",
    label: "Automations",
    icon: <path d="M11 2 4.5 11.5H9L8 18l6.5-9.5H10l1-6.5Z" />,
  },
  {
    href: "/admin/performance",
    label: "Performance",
    icon: <path d="M4 17V11M10 17V4M16 17v-7M2.5 17h15" />,
  },
  {
    href: "/admin/media",
    label: "Media library",
    icon: (
      <>
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <circle cx="7.5" cy="8.5" r="1.3" />
        <path d="M4 15l4-4 3 3 2-2 3 3" />
      </>
    ),
  },
  {
    href: "/admin/ideation",
    label: "Ideation",
    icon: (
      <path d="M10 2a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9ZM7.5 15h5M8.5 17.5h3" />
    ),
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

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Close the mobile drawer on navigation — adjusted during render (not an
  // effect) per React's "reset state when a prop changes" pattern, so it
  // never triggers a second cascading render.
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
          "fixed inset-y-0 left-0 z-40 flex w-[min(250px,80vw)] flex-shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-ink px-3 py-4 text-canvas transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "md:w-[68px]" : "md:w-[232px]",
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

        <div
          className={cn(
            "mb-4 px-2 text-[12px] font-semibold tracking-[0.09em] text-[#948B90] uppercase",
            collapsed && "md:hidden",
          )}
        >
          Social media
        </div>

        <nav className="flex flex-1 flex-col">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
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
                <span className={cn(collapsed && "md:hidden")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
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
