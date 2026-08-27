import Link from "next/link";
import { Wordmark } from "@/components/ui/topbar";

export function MarketingFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <Link href="/" className="no-underline">
          <Wordmark className="h-5 w-auto text-ink" />
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
          <Link href="/login" className="hover:text-ink">
            Sign up
          </Link>
          <Link href="/login" className="hover:text-ink">
            Sign in
          </Link>
          <Link href="/account/billing" className="hover:text-ink">
            Billing
          </Link>
          <Link href="/contact" className="hover:text-ink">
            Contact
          </Link>
        </nav>
        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} First Look.
        </p>
      </div>
    </footer>
  );
}
