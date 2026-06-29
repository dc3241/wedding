"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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
  return Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / 86_400_000));
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

export function PlannerProjectSidebar({
  projects,
}: {
  projects: SidebarProject[];
}) {
  const pathname = usePathname();
  const activeProjectId = extractProjectId(pathname);
  const onDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard?");
  const onLeads = pathname === "/leads" || pathname.startsWith("/leads?");
  const onBilling =
    pathname === "/account/billing" ||
    pathname.startsWith("/account/billing?");

  return (
    <aside className="w-[260px] shrink-0">
      <Card className="p-1.5">
        <div className="flex flex-col gap-0.5 px-2.5 pb-3 pt-2">
          <Link
            href="/dashboard"
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              onDashboard
                ? "bg-plum-tint text-plum-deep"
                : "text-ink-muted hover:bg-porcelain hover:text-ink",
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/leads"
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              onLeads
                ? "bg-plum-tint text-plum-deep"
                : "text-ink-muted hover:bg-porcelain hover:text-ink",
            )}
          >
            Leads
          </Link>
          <Link
            href="/account/billing"
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              onBilling
                ? "bg-plum-tint text-plum-deep"
                : "text-ink-muted hover:bg-porcelain hover:text-ink",
            )}
          >
            Billing
          </Link>
        </div>
        <div className="px-2.5 pb-2">
          <Eyebrow>Active weddings</Eyebrow>
        </div>
        <nav className="flex flex-col">
          {projects.map((project) => {
            const active = project.id === activeProjectId;
            const days = daysUntil(project.wedding_date);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-lg px-3 py-[11px] no-underline transition-colors",
                  active ? "bg-plum-tint" : "hover:bg-porcelain",
                )}
              >
                <div className="min-w-0">
                  <div
                    className={cn(
                      "truncate text-sm",
                      active ? "font-medium text-plum-deep" : "text-ink",
                    )}
                  >
                    {project.name}
                  </div>
                  <div className="mt-px text-xs text-ink-muted tabnum">
                    {formatSidebarDate(project.wedding_date)}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-ink-muted tabnum">
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
