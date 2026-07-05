"use client";

import { LogoutButton } from "@/components/auth/logout-button";
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

const navLinkClass = (active: boolean) =>
  cn(
    "block rounded-[var(--radius)] px-3.5 py-2.5 text-[15px] transition-colors",
    active
      ? "bg-plum-tint font-medium text-plum-deep shadow-[inset_2px_0_0_var(--plum)]"
      : "text-ink-soft hover:bg-stone-soft hover:text-ink",
  );

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
        <div className="mb-6 flex flex-col gap-0.5 px-2.5 pb-3 pt-2">
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
        <div className="mb-3.5 h-px bg-stone" />
        <div className="px-2.5 pb-3.5">
          <Eyebrow>Active weddings</Eyebrow>
        </div>
        <nav className="flex flex-col gap-0.5 px-1.5 pb-1.5">
          {projects.map((project) => {
            const active = project.id === activeProjectId;
            const days = daysUntil(project.wedding_date);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-[var(--radius)] border px-4 py-3.5 no-underline transition-colors",
                  active
                    ? "border-transparent bg-plum-tint"
                    : "border-stone bg-surface hover:bg-stone-soft",
                )}
              >
                <div className="min-w-0">
                  <div
                    className={cn(
                      "couple-name truncate text-[21px] leading-[1.1]",
                      active ? "text-plum-deep" : "text-ink",
                    )}
                  >
                    {project.name}
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-muted tabnum">
                    {formatSidebarDate(project.wedding_date)}
                  </div>
                </div>
                <span className="shrink-0 text-base text-ink-muted tabnum">
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
