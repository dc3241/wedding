import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-stone px-6 py-8">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 text-[13px] text-ink-muted sm:flex-row">
        <p>© {new Date().getFullYear()} First Look</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/login" className="no-underline hover:text-ink">
            Log in
          </Link>
          <Link href="#features" className="no-underline hover:text-ink">
            Features
          </Link>
          <Link href="#for-planners" className="no-underline hover:text-ink">
            For planners
          </Link>
        </nav>
      </div>
    </footer>
  );
}
