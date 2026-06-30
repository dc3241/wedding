import { ButtonLink } from "@/components/ui/button";
import { NavLink, NavLinks, Topbar, Wordmark } from "@/components/ui/topbar";
import Link from "next/link";

export function MarketingTopbar() {
  return (
    <Topbar>
      <Link href="/" className="no-underline">
        <Wordmark />
      </Link>
      <NavLinks>
        <NavLink href="#features">Features</NavLink>
        <NavLink href="#for-planners">For planners</NavLink>
        <NavLink href="/login">Log in</NavLink>
      </NavLinks>
      <div className="flex items-center gap-2">
        <ButtonLink
          href="/login"
          variant="ghost"
          className="hidden text-sm sm:inline-flex"
        >
          Log in
        </ButtonLink>
        <ButtonLink href="/login" variant="primary" className="text-sm md:text-[15px]">
          Get started
        </ButtonLink>
      </div>
    </Topbar>
  );
}
