"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type SidebarProject = {
  id: string;
  name: string;
  wedding_date: string | null;
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

function formatSidebarDate(date: string | null) {
  if (!date) return "No date set";
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

const navLinkClass = (active: boolean) =>
  cn(
    "block rounded-[var(--radius-inner)] px-3.5 py-2.5 text-[14px] font-medium transition-colors",
    active
      ? "bg-accent-wash font-semibold text-accent shadow-[inset_2px_0_0_var(--accent)]"
      : "text-muted hover:bg-well hover:text-ink",
  );

export function PlannerProjectSidebar({
  projects,
}: {
  projects: SidebarProject[];
}) {
  const pathname = usePathname();
  const activeProjectId = extractProjectId(pathname);
  const onDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard?");
  const onLeads = pathname === "/leads" || pathname.startsWith("/leads?");
  const onBilling =
    pathname === "/account/billing" ||
    pathname.startsWith("/account/billing?");

  return (
    <aside className="w-[260px] shrink-0">
      <Card className="p-2">
        <div className="mb-4 flex flex-col gap-0.5 px-1.5 pb-2 pt-1.5">
          <Link href="/dashboard" className={navLinkClass(onDashboard)}>
            Dashboard
          </Link>
          <Link href="/leads" className={navLinkClass(onLeads)}>
            Leads
          </Link>
          <Link href="/account/billing" className={navLinkClass(onBilling)}>
            Billing
          </Link>
          <div className="px-1.5 pt-1">
            <LogoutButton />
          </div>
        </div>
        <div className="mb-3 h-px bg-hairline" />
        <div className="px-3.5 pb-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Active weddings
          </p>
        </div>
        <nav className="flex flex-col gap-1.5 px-1.5 pb-1.5">
          {projects.map((project) => {
            const active = project.id === activeProjectId;
            const days = daysUntil(project.wedding_date);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-[var(--radius-inner)] px-3.5 py-3 no-underline transition-colors",
                  active
                    ? "bg-accent-wash"
                    : "bg-well shadow-recessed hover:opacity-90",
                )}
              >
                <div className="min-w-0">
                  <div
                    className={cn(
                      "truncate text-[15px] font-semibold leading-snug",
                      active ? "text-accent" : "text-ink",
                    )}
                  >
                    {project.name}
                  </div>
                  <div className="mt-0.5 text-[12px] tabular-nums text-muted">
                    {formatSidebarDate(project.wedding_date)}
                  </div>
                </div>
                <span className="shrink-0 text-[13px] font-medium tabular-nums text-muted">
                  {days === null ? "—" : `${days}d`}
                </span>
              </Link>
            );
          })}
        </nav>
      </Card>
    </aside>
  );
}
