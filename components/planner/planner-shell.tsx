"use client";

import { PlannerProjectSidebar } from "@/components/planner/planner-project-sidebar";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
import { Wordmark } from "@/components/ui/topbar";
import {
  BRAND_ACCENT_HEX,
  DEFAULT_BRAND_NAME,
  type ProjectBranding,
} from "@/lib/branding/types";
import { cn } from "@/lib/cn";
import { acquireScrollLock, releaseScrollLock } from "@/lib/scroll-lock";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { AccountPlan } from "@/lib/account-context";

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
    </svg>
  );
}

function BrandMark({ branding }: { branding: ProjectBranding }) {
  const name = branding.brandName?.trim() || DEFAULT_BRAND_NAME;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {branding.brandLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public brand-media URL
        <img
          src={branding.brandLogoUrl}
          alt={name}
          className="h-7 w-auto max-w-[180px] object-contain"
        />
      ) : (
        <Wordmark />
      )}
      {branding.brandName?.trim() ? (
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {branding.brandName.trim()}
        </span>
      ) : null}
    </div>
  );
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
  // Same --accent override mechanism as CoupleShell (inline CSS var).
  const accent =
    branding?.brandAccentColor &&
    BRAND_ACCENT_HEX.test(branding.brandAccentColor)
      ? branding.brandAccentColor
      : null;

  const style = accent
    ? ({ ["--accent"]: accent } as CSSProperties)
    : undefined;

  const pathname = usePathname();
  const sidebarId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [paneTop, setPaneTop] = useState(64);

  useEffect(() => {
    function update() {
      const el = headerRef.current;
      if (!el) return;
      setPaneTop(el.getBoundingClientRect().bottom);
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    function onChange() {
      if (mq.matches) setNavOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!navOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }

    acquireScrollLock();
    window.addEventListener("keydown", onKey);
    return () => {
      releaseScrollLock();
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  return (
    <div
      className="flex min-h-full min-w-0 flex-col bg-canvas"
      style={style}
    >
      <header
        ref={headerRef}
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-hairline bg-canvas px-4 py-[18px] lg:px-8"
      >
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-inner)] text-ink hover:bg-well lg:hidden"
          aria-label="Menu"
          aria-expanded={navOpen}
          aria-controls={sidebarId}
          onClick={() => setNavOpen((open) => !open)}
        >
          <MenuIcon />
        </button>
        <div className="min-w-0">
          {branding ? <BrandMark branding={branding} /> : <Wordmark />}
        </div>
      </header>
      <div className="flex min-w-0 flex-1 gap-6 px-4 py-5 lg:px-8 lg:py-7">
        <div className="hidden shrink-0 lg:block">
          <PlannerProjectSidebar projects={projects} plan={plan} />
        </div>

        {navOpen ? (
          <div
            // Overlay stack (SHELL-MOBILE-01a): drawer dim z-30 / pane z-40;
            // assistant dim z-50 / pane z-[60]; tour z-[80]. Assistant wins.
            className="fixed inset-x-0 bottom-0 z-30 bg-ink/20 lg:hidden"
            style={{ top: paneTop }}
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
        ) : null}

        <div
          id={sidebarId}
          className={cn(
            "fixed bottom-0 left-0 z-40 w-[min(260px,85vw)] overflow-y-auto border-r border-hairline bg-canvas p-3 lg:hidden",
            "transition-transform duration-200 motion-reduce:transition-none",
            navOpen
              ? "translate-x-0"
              : "pointer-events-none -translate-x-full",
          )}
          style={{ top: paneTop }}
          role={navOpen ? "dialog" : undefined}
          aria-modal={navOpen ? true : undefined}
          aria-label="Planner navigation"
          aria-hidden={!navOpen}
          inert={!navOpen}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setNavOpen(false);
            }
          }}
        >
          <PlannerProjectSidebar
            projects={projects}
            plan={plan}
            className="w-full"
          />
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
