"use client";

import { AccountBrandMark } from "@/components/branding/account-brand-mark";
import { AssistantSparkleIcon } from "@/components/assistant/AssistantSparkleIcon";
import {
  RAIL_ASSISTANT_ANCHOR_ATTR,
  requestOpenAssistant,
} from "@/components/assistant/open-assistant-event";
import {
  billingIcon,
  collapseIcon,
  contactIcon,
  customizeIcon,
  logoutIcon,
  menuIcon,
  RailIcon,
  sectionIcon,
  weddingIcon,
} from "@/components/couple/couple-sidebar-icons";
import { WorkspaceToolsMenu } from "@/components/projects/workspace-tools-menu";
import { Wordmark } from "@/components/ui/topbar";
import type { AccountKind } from "@/lib/account-context";
import { brandAccentStyle } from "@/lib/branding/accent-style";
import type { ProjectBranding } from "@/lib/branding/types";
import { cn } from "@/lib/cn";
import type { HideableTool } from "@/lib/event-type";
import {
  canCustomizeWorkspace,
  projectTabHref,
  tabsForAccountKind,
} from "@/lib/project-tabs";
import { acquireScrollLock, releaseScrollLock } from "@/lib/scroll-lock";
import { displayCoupleNames } from "@/lib/wedding-date";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Couple / invited-member chrome: light collapsible rail (same mechanics as
 * PlannerShell — collapse to icons on desktop, drawer on mobile) holding the
 * wedding's sections, the Assistant, Customize, and Account links. Replaces
 * the old top bar + horizontally scrolling project tab strip for couples.
 *
 * Planners keep PlannerShell + the tab strip; nothing here applies to them.
 */

export type CoupleRailProject = {
  id: string;
  name: string;
  weddingDate: string | null;
  hiddenTools: HideableTool[];
  /** project_members.role for invited members; null for account owners. */
  memberRole: string | null;
};

const ITEM_BASE =
  "group relative mb-0.5 flex w-full items-center gap-3 rounded-[var(--radius-inner)] px-2.5 py-2 text-left text-[15px] font-medium whitespace-nowrap text-muted no-underline transition-colors hover:bg-well hover:text-ink";
const ITEM_ACTIVE = "bg-accent-wash font-semibold text-ink hover:bg-accent-wash";

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

function RailTooltip({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-20 -translate-y-1/2 rounded-lg bg-ink px-[11px] py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-canvas shadow-raised",
        "invisible opacity-0 transition-opacity duration-100",
        collapsed && "md:group-hover:visible md:group-hover:opacity-100",
      )}
    >
      {label}
    </span>
  );
}

function RailLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        ITEM_BASE,
        collapsed && "md:justify-center",
        active && ITEM_ACTIVE,
      )}
    >
      <span className={active ? "text-accent" : undefined}>
        <RailIcon>{icon}</RailIcon>
      </span>
      <span className={cn("min-w-0 truncate", collapsed && "md:hidden")}>
        {label}
      </span>
      <RailTooltip label={label} collapsed={collapsed} />
    </Link>
  );
}

function RailGroupLabel({
  children,
  collapsed,
}: {
  children: ReactNode;
  collapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "truncate px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase",
        collapsed && "md:hidden",
      )}
    >
      {children}
    </div>
  );
}

function RailDivider() {
  return <div className="mx-2 my-2 h-px shrink-0 bg-hairline" />;
}

function LogoutSubmit({ collapsed }: { collapsed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        ITEM_BASE,
        "disabled:opacity-50",
        collapsed && "md:justify-center",
      )}
    >
      <RailIcon>{logoutIcon}</RailIcon>
      <span className={cn(collapsed && "md:hidden")}>
        {pending ? "Logging out…" : "Log out"}
      </span>
      <RailTooltip label="Log out" collapsed={collapsed} />
    </button>
  );
}

function AssistantRailButton({ collapsed }: { collapsed: boolean }) {
  return (
    <button
      type="button"
      {...{ [RAIL_ASSISTANT_ANCHOR_ATTR]: "" }}
      onClick={() => requestOpenAssistant()}
      aria-controls="assistant-panel"
      className={cn(
        "group relative mb-2 flex w-full items-center gap-3 rounded-[var(--radius-inner)] border border-ring bg-canvas px-2.5 py-2 text-left text-[15px] font-semibold whitespace-nowrap text-ink transition-colors hover:border-accent",
        collapsed && "md:justify-center",
      )}
    >
      <AssistantSparkleIcon className="size-[19px] shrink-0 text-accent" />
      <span className={cn(collapsed && "md:hidden")}>Assistant</span>
      <RailTooltip label="Assistant" collapsed={collapsed} />
    </button>
  );
}

export function CoupleShell({
  children,
  branding = null,
  accountKind,
  projects,
  homeProjectId,
}: {
  children: ReactNode;
  branding?: ProjectBranding | null;
  /** "personal" = self-serve couple; null = invited member with no account. */
  accountKind: AccountKind | null;
  projects: CoupleRailProject[];
  /** Couple's own wedding — shown on non-wedding pages (Billing, Contact). */
  homeProjectId: string | null;
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

  const pathProjectId = extractProjectId(pathname);
  const inProject = pathProjectId !== null;
  // Onboarding gates every wedding page, so section links would only bounce.
  const onOnboarding = isPathActive(pathname, "/onboarding");
  const currentProject: CoupleRailProject | null = (() => {
    if (onOnboarding) return null;
    const targetId =
      pathProjectId ??
      homeProjectId ??
      (projects.length === 1 ? projects[0].id : null);
    if (!targetId) return null;
    return (
      projects.find((p) => p.id === targetId) ?? {
        id: targetId,
        name: "",
        weddingDate: null,
        hiddenTools: [],
        memberRole: null,
      }
    );
  })();

  const sections = currentProject
    ? tabsForAccountKind(
        accountKind,
        currentProject.memberRole,
        currentProject.hiddenTools,
      )
    : [];
  const canCustomize =
    currentProject !== null &&
    canCustomizeWorkspace(accountKind, currentProject.memberRole);
  const showWeddingList = accountKind === null && projects.length > 1;
  const homeHref = currentProject
    ? projectTabHref(currentProject.id, "")
    : "/projects";
  const weddingLabel = currentProject?.name
    ? displayCoupleNames(currentProject.name)
    : "Your wedding";

  return (
    <div className="flex min-h-screen" style={style}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(250px,80vw)] flex-shrink-0 flex-col border-r border-hairline bg-surface px-3 py-4 text-ink transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "md:w-[68px] md:overflow-visible" : "overflow-hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "mb-3 flex flex-shrink-0 items-center px-1 pt-1 pb-2",
            collapsed ? "md:justify-center" : "justify-between",
          )}
        >
          <Link
            href={homeHref}
            className={cn("min-w-0 no-underline", collapsed && "md:hidden")}
            aria-label="Your wedding"
          >
            {branding ? (
              <AccountBrandMark branding={branding} />
            ) : (
              <Wordmark className="h-6 w-auto text-ink" />
            )}
          </Link>
          {collapsed ? (
            <Link
              href={homeHref}
              className="hidden font-sans text-[17px] font-extrabold text-ink no-underline md:block"
              aria-label="Your wedding"
            >
              {branding?.brandName?.trim().charAt(0).toUpperCase() || "F"}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className={cn(
              "hidden size-[26px] shrink-0 items-center justify-center rounded-lg bg-well text-muted hover:text-ink md:flex",
              collapsed &&
                "md:absolute md:top-4 md:right-1/2 md:translate-x-1/2",
            )}
          >
            <span
              className={cn("transition-transform", collapsed && "rotate-180")}
            >
              {collapseIcon}
            </span>
          </button>
        </div>

        <nav
          aria-label="Wedding"
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            !collapsed && "overflow-x-hidden overflow-y-auto",
            collapsed && "md:mt-6",
          )}
        >
          {inProject ? <AssistantRailButton collapsed={collapsed} /> : null}

          {currentProject ? (
            <div className="flex flex-col">
              <RailGroupLabel collapsed={collapsed}>
                {weddingLabel}
              </RailGroupLabel>
              {sections.map((tab) => {
                const href = projectTabHref(currentProject.id, tab.segment);
                const active =
                  tab.segment === ""
                    ? pathname === href
                    : isPathActive(pathname, href);
                return (
                  <RailLink
                    key={tab.segment || "overview"}
                    href={href}
                    label={tab.label}
                    icon={sectionIcon(tab.segment)}
                    active={active}
                    collapsed={collapsed}
                  />
                );
              })}
              {canCustomize ? (
                <WorkspaceToolsMenu
                  projectId={currentProject.id}
                  accountKind={accountKind}
                  projectMemberRole={currentProject.memberRole}
                  hiddenTools={currentProject.hiddenTools}
                  renderTrigger={({ open, onClick }) => (
                    <button
                      type="button"
                      onClick={onClick}
                      aria-haspopup="dialog"
                      aria-expanded={open}
                      className={cn(
                        ITEM_BASE,
                        "mt-1 py-1.5 text-[13.5px]",
                        collapsed && "md:justify-center",
                      )}
                    >
                      <RailIcon>{customizeIcon}</RailIcon>
                      <span className={cn(collapsed && "md:hidden")}>
                        Customize
                      </span>
                      <RailTooltip label="Customize" collapsed={collapsed} />
                    </button>
                  )}
                />
              ) : null}
            </div>
          ) : null}

          {showWeddingList ? (
            <div className="mt-1">
              <RailDivider />
              <RailGroupLabel collapsed={collapsed}>Your weddings</RailGroupLabel>
              {projects.map((project) => {
                const active = project.id === pathProjectId;
                const days = daysUntil(project.weddingDate);
                const name = displayCoupleNames(project.name);
                return (
                  <Link
                    key={project.id}
                    href={projectTabHref(project.id, "")}
                    className={cn(
                      ITEM_BASE,
                      collapsed && "md:justify-center",
                      active && ITEM_ACTIVE,
                    )}
                  >
                    <span className={active ? "text-accent" : undefined}>
                      <RailIcon>{weddingIcon}</RailIcon>
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        collapsed && "md:hidden",
                      )}
                    >
                      {name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[12px] font-medium tabular-nums text-muted",
                        collapsed && "md:hidden",
                      )}
                    >
                      {days === null ? "—" : `${days}d`}
                    </span>
                    <RailTooltip label={name} collapsed={collapsed} />
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="mt-auto pt-1">
            <RailDivider />
            <RailGroupLabel collapsed={collapsed}>Account</RailGroupLabel>
            {!currentProject && !showWeddingList ? (
              <RailLink
                href="/projects"
                label="Your wedding"
                icon={weddingIcon}
                active={false}
                collapsed={collapsed}
              />
            ) : null}
            <RailLink
              href="/account/billing"
              label="Billing"
              icon={billingIcon}
              active={isPathActive(pathname, "/account/billing")}
              collapsed={collapsed}
            />
            <RailLink
              href="/contact"
              label="Contact"
              icon={contactIcon}
              active={isPathActive(pathname, "/contact")}
              collapsed={collapsed}
            />
            <form action="/logout" method="post">
              <LogoutSubmit collapsed={collapsed} />
            </form>
          </div>
        </nav>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[color:var(--ink)]/25 md:hidden"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-hairline bg-canvas px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
            className="flex size-[38px] items-center justify-center rounded-[var(--radius-inner)] text-ink hover:bg-well"
          >
            {menuIcon}
          </button>
          <Link
            href={homeHref}
            className="min-w-0 no-underline"
            aria-label="Your wedding"
          >
            {branding ? (
              <AccountBrandMark branding={branding} />
            ) : (
              <Wordmark className="h-6 w-auto text-ink" />
            )}
          </Link>
          {inProject ? (
            <button
              type="button"
              {...{ [RAIL_ASSISTANT_ANCHOR_ATTR]: "" }}
              onClick={() => requestOpenAssistant()}
              aria-controls="assistant-panel"
              aria-label="Assistant"
              className="ml-auto flex items-center gap-1.5 rounded-full border border-ring bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
            >
              <AssistantSparkleIcon className="size-[17px] text-accent" />
              Assistant
            </button>
          ) : null}
        </div>

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
