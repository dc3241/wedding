"use client";

import { logout } from "@/app/login/actions";
import type { AccountPlan } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { getCopy } from "@/lib/venue-copy";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type SidebarProject = {
  id: string;
  name: string;
  wedding_date: string | null;
};

type NavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

function daysUntil(date: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(date + "T00:00:00");
  return Math.max(
    0,
    Math.ceil((wedding.getTime() - today.getTime()) / 86_400_000),
  );
}

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

function isPathActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard?");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

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

const dashboardIcon = <path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5M8 17v-5h4v5" />;
const calendarIcon = (
  <>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
    <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
  </>
);
const leadsIcon = (
  <>
    <circle cx="7" cy="7.5" r="2.5" />
    <circle cx="13.5" cy="8" r="2" />
    <path d="M2.5 16.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M12 12.5c1.8 0 3.5 1 3.5 3" />
  </>
);
const automationsIcon = (
  <path d="M11.5 2.5 5 11h5l-1.5 6.5L15.5 9h-5L11.5 2.5Z" />
);
const vendorsIcon = (
  <>
    <path d="M3.5 8.5 5 4.5h10l1.5 4" />
    <path d="M3.5 8.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.5" />
    <path d="M8 17v-4.5h4V17" />
  </>
);
const contractsIcon = (
  <>
    <path d="M6 3.5h5.5L15.5 7v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
    <path d="M11.5 3.5V7H15.5M7.5 10.5h5M7.5 13.5h5" />
  </>
);
const invoicesIcon = (
  <>
    <path d="M5 3.5h10a1 1 0 0 1 1 1v11l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2v-11a1 1 0 0 1 1-1Z" />
    <path d="M7.5 8h5M7.5 11h3.5" />
  </>
);
const moneyIcon = (
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.5v7M12.5 8.2c-.5-.7-1.3-1-2.5-1s-2 .4-2 1.5 1 1.4 2.5 1.7 2.5.6 2.5 1.8-1 1.5-2.5 1.5-2.1-.4-2.5-1.1" />
  </>
);
const teamIcon = (
  <>
    <circle cx="10" cy="6.5" r="2.5" />
    <path d="M4.5 16.5c0-2.8 2.4-4.5 5.5-4.5s5.5 1.7 5.5 4.5" />
  </>
);
const brandingIcon = (
  <>
    <circle cx="10" cy="10" r="7" />
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 3v2.5M10 14.5V17M3 10h2.5M14.5 10H17" />
  </>
);
const billingIcon = (
  <>
    <rect x="2.5" y="5" width="15" height="10.5" rx="1.5" />
    <path d="M2.5 8.5h15M6 12.5h3" />
  </>
);
const contactIcon = (
  <>
    <rect x="3" y="4.5" width="14" height="11" rx="1.5" />
    <path d="M3.5 6.5 10 11l6.5-4.5" />
  </>
);
const logoutIcon = <path d="M8 3.5H4.5A1.5 1.5 0 0 0 3 5v10a1.5 1.5 0 0 0 1.5 1.5H8M12.5 13.5 16 10l-3.5-3.5M16 10H8" />;
const projectIcon = (
  <>
    <circle cx="10" cy="10" r="6.5" />
    <path d="M10 6.5v7M6.5 10h7" />
  </>
);

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const active = item.match
    ? item.match(pathname)
    : isPathActive(pathname, item.href);

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
      <span className={cn("min-w-0 truncate", collapsed && "md:hidden")}>
        {item.label}
      </span>
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

function LogoutSubmit({ collapsed }: { collapsed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "group relative mb-0.5 flex w-full items-center gap-3 rounded-[var(--radius-inner)] px-2.5 py-2.5 text-left text-[15px] font-medium whitespace-nowrap text-[#C9BFC4] hover:bg-white/8 hover:text-canvas disabled:opacity-50",
        collapsed && "md:justify-center",
      )}
    >
      <NavIcon>{logoutIcon}</NavIcon>
      <span className={cn(collapsed && "md:hidden")}>
        {pending ? "Logging out…" : "Log out"}
      </span>
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-20 -translate-y-1/2 rounded-lg bg-[#3D2430] px-[11px] py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-canvas shadow-raised",
          "invisible opacity-0 transition-opacity duration-100",
          collapsed && "md:group-hover:visible md:group-hover:opacity-100",
        )}
      >
        Log out
      </span>
    </button>
  );
}

export function PlannerProjectSidebar({
  projects,
  plan = "planner",
  collapsed = false,
  className,
}: {
  projects: SidebarProject[];
  plan?: AccountPlan;
  collapsed?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const activeProjectId = extractProjectId(pathname);
  const projectsLabel = getCopy("sidebarActiveProjects", plan);

  const primaryNav: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      tooltip: "Dashboard",
      icon: dashboardIcon,
    },
    {
      href: "/calendar",
      label: "Calendar",
      tooltip: "Calendar",
      icon: calendarIcon,
    },
    {
      href: "/leads",
      label: getCopy("sidebarLeads", plan),
      tooltip: getCopy("sidebarLeads", plan),
      icon: leadsIcon,
    },
    {
      href: "/automations",
      label: "Automations",
      tooltip: "Automations",
      icon: automationsIcon,
    },
    {
      href: "/vendors",
      label: "Vendors",
      tooltip: "Vendors",
      icon: vendorsIcon,
    },
    {
      href: "/contracts",
      label: "Contracts",
      tooltip: "Contracts",
      icon: contractsIcon,
    },
    {
      href: "/invoices",
      label: getCopy("sidebarInvoices", plan),
      tooltip: getCopy("sidebarInvoices", plan),
      icon: invoicesIcon,
    },
    {
      href: "/money",
      label: getCopy("sidebarMoney", plan),
      tooltip: getCopy("sidebarMoney", plan),
      icon: moneyIcon,
    },
  ];

  const accountNav: NavItem[] = [
    {
      href: "/account/team",
      label: "Team",
      tooltip: "Team",
      icon: teamIcon,
    },
    {
      href: "/account/branding",
      label: "Branding",
      tooltip: "Branding",
      icon: brandingIcon,
    },
    {
      href: "/account/billing",
      label: "Billing",
      tooltip: "Billing",
      icon: billingIcon,
    },
    {
      href: "/contact",
      label: "Contact",
      tooltip: "Contact",
      icon: contactIcon,
    },
  ];

  return (
    <nav className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex flex-col">
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </div>

      <div className="mt-1">
        <div className="mx-2 my-2 h-px shrink-0 bg-white/10" />
        <div
          className={cn(
            "px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-[#948B90] uppercase",
            collapsed && "md:hidden",
          )}
        >
          Account
        </div>
        {accountNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
        <form action={logout}>
          <LogoutSubmit collapsed={collapsed} />
        </form>
      </div>

      <div className="mt-1 min-h-0 flex-1">
        <div className="mx-2 my-2 h-px shrink-0 bg-white/10" />
        <div
          className={cn(
            "px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-[#948B90] uppercase",
            collapsed && "md:hidden",
          )}
        >
          {projectsLabel}
        </div>
        <div className="flex flex-col pb-2">
          {projects.length === 0 ? (
            <p
              className={cn(
                "px-2.5 py-2 text-[13px] text-[#948B90]",
                collapsed && "md:hidden",
              )}
            >
              None yet
            </p>
          ) : (
            projects.map((project) => {
              const active = project.id === activeProjectId;
              const days = daysUntil(project.wedding_date);

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    "group relative mb-0.5 flex items-center gap-3 rounded-[var(--radius-inner)] px-2.5 py-2.5 text-[15px] font-medium text-[#C9BFC4] hover:bg-white/8 hover:text-canvas",
                    collapsed && "md:justify-center",
                    active && "bg-white/12 font-semibold text-canvas",
                  )}
                >
                  <span className={active ? "text-accent" : undefined}>
                    <NavIcon>{projectIcon}</NavIcon>
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate whitespace-nowrap",
                      collapsed && "md:hidden",
                    )}
                  >
                    {project.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[12px] font-medium tabular-nums text-[#948B90]",
                      collapsed && "md:hidden",
                      active && "text-[#C9BFC4]",
                    )}
                  >
                    {days === null ? "—" : `${days}d`}
                  </span>
                  <span
                    className={cn(
                      "pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-20 -translate-y-1/2 rounded-lg bg-[#3D2430] px-[11px] py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-canvas shadow-raised",
                      "invisible opacity-0 transition-opacity duration-100",
                      collapsed &&
                        "md:group-hover:visible md:group-hover:opacity-100",
                    )}
                  >
                    {project.name}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </nav>
  );
}
