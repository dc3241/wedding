import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
          Wedding App
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
          <Link href="/signup" className="hover:text-ink">
            Sign up
          </Link>
          <Link href="/login" className="hover:text-ink">
            Sign in
          </Link>
          <Link href="/billing" className="hover:text-ink">
            Billing
          </Link>
        </nav>
        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} Soft stack planning.
        </p>
      </div>
    </footer>
  );
}
