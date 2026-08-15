"use client";

import { ButtonLink } from "@/components/ui/button";
import { NavLink, NavLinks, Wordmark } from "@/components/ui/topbar";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

const NAV = [
  { id: "features", label: "Features", href: "/#features", hash: true },
  { id: "planners", label: "For planners", href: "/for-planners", hash: false },
  { id: "venues", label: "For venues", href: "/for-venues", hash: false },
  { id: "pricing", label: "Pricing", href: "/pricing", hash: false },
] as const;

const navLinkClass =
  "relative rounded-none bg-transparent px-3 py-1.5 text-[14px] font-medium text-muted no-underline transition-colors duration-150 hover:bg-transparent hover:text-ink after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150 hover:after:scale-x-100 motion-reduce:after:transition-none";

const navLinkActiveClass = "text-ink after:scale-x-100";

/**
 * Same-page section nav: set a CLEAN single hash (never append), scroll to the
 * target, and fire hashchange so audience-section can sync its tab.
 * Off-home, let Next.js <Link> do a normal navigation to /#id.
 */
function navigateToSection(
  e: MouseEvent<HTMLAnchorElement>,
  sectionId: string,
  onHome: boolean,
) {
  if (!onHome) return;

  e.preventDefault();
  const nextUrl = `/#${sectionId}`;
  if (window.location.pathname + window.location.hash !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
  } else {
    // Already on this hash — still ensure a single clean fragment.
    window.history.replaceState(null, "", nextUrl);
  }
  window.dispatchEvent(new Event("hashchange"));

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

export function MarketingTopbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Pathname-dependent active styles only after mount — avoids SSR/client mismatch.
  const onHome = mounted && pathname === "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!onHome) {
      setActiveSection(null);
      return;
    }

    // Features is the only remaining homepage hash target in the topbar.
    const ids = NAV.filter((item) => item.hash).map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [onHome]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-canvas/82 backdrop-blur-[10px] transition-[border-color,background] duration-200 motion-reduce:transition-none",
        scrolled ? "border-hairline bg-canvas/94" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-6 md:px-10">
        <Link href="/" className="shrink-0 no-underline">
          <Wordmark />
        </Link>
        <NavLinks className="min-w-0 flex-1 justify-center gap-0.5 lg:gap-1">
          {NAV.map((item) => {
            const isActive = item.hash
              ? onHome && activeSection === item.id
              : mounted && pathname === item.href;
            return (
              <NavLink
                key={item.id}
                href={item.href}
                className={cn(navLinkClass, isActive && navLinkActiveClass)}
                onClick={
                  item.hash
                    ? (e) => navigateToSection(e, item.id, onHome)
                    : undefined
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </NavLinks>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ButtonLink
            href="/login"
            variant="default"
            className="hidden sm:inline-flex"
          >
            Log in
          </ButtonLink>
          <ButtonLink href="/login" variant="primary">
            Get started
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
