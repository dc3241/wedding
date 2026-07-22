"use client";

import { ButtonLink } from "@/components/ui/button";
import { NavLink, NavLinks, Wordmark } from "@/components/ui/topbar";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

export function MarketingTopbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-canvas/82 backdrop-blur-[10px] transition-[border-color,background] duration-200",
        scrolled
          ? "border-hairline bg-canvas/94"
          : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="no-underline">
          <Wordmark />
        </Link>
        <NavLinks className="gap-1">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#for-planners">For planners</NavLink>
          <NavLink href="/login" className="md:hidden">
            Log in
          </NavLink>
        </NavLinks>
        <div className="flex items-center gap-2 sm:gap-5">
          <ButtonLink
            href="/login"
            variant="ghost"
            className="hidden text-[15px] text-muted hover:bg-transparent hover:text-ink sm:inline-flex"
          >
            Log in
          </ButtonLink>
          <ButtonLink href="/login" variant="primary" className="text-sm md:text-[15px]">
            Get started
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
