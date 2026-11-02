import Link from "next/link";
import { Wordmark } from "@/components/ui/topbar";
import { demoEntryPath } from "@/lib/demo/entry-path";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";

const PRODUCT = B2B_MARKETING_ENABLED
  ? ([
      { href: "/for-planners", label: "For planners" },
      { href: "/for-venues", label: "For venues" },
      { href: "/", label: "For couples" },
      { href: "/pricing", label: "Pricing" },
    ] as const)
  : ([
      { href: "/", label: "Wedding planning app" },
      { href: "/pricing", label: "Pricing" },
      { href: demoEntryPath("personal"), label: "Live demo" },
    ] as const);

const COMPARE = [
  { href: "/wedding-planner-crm", label: "Wedding planner CRM" },
  { href: "/honeybook-alternative", label: "HoneyBook alternative" },
  { href: "/dubsado-alternative", label: "Dubsado alternative" },
  {
    href: "/wedding-inquiry-pipeline",
    label: "Inquiry pipeline",
  },
  {
    href: "/wedding-planner-contract-template",
    label: "Contract template",
  },
] as const;

const PLAN = [
  { href: "/wedding-planning-checklist", label: "Checklist" },
  { href: "/wedding-guest-list", label: "Guest list" },
  { href: "/wedding-seating-chart", label: "Seating chart" },
  { href: "/wedding-budget-tracking", label: "Budget" },
] as const;

const COMPANY = [
  { href: "/login", label: "Sign in" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
] as const;

function FooterNav({
  label,
  links,
}: {
  label: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-x-5 gap-y-2">
      {links.map((link) =>
        // /demo is a route handler that mints a demo session — a plain
        // anchor so Link prefetch can never start one in the background.
        link.href.startsWith("/demo") ? (
          <a key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </a>
        ) : (
          <Link key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <Link href="/" className="no-underline">
            <Wordmark className="h-5 w-auto text-ink" />
          </Link>
          <div className="flex flex-col gap-3 text-[13px] text-muted">
            <FooterNav label="Product" links={PRODUCT} />
            {B2B_MARKETING_ENABLED ? (
              <FooterNav label="Compare" links={COMPARE} />
            ) : null}
            <FooterNav label="Planning" links={PLAN} />
            <FooterNav label="Company" links={COMPANY} />
          </div>
        </div>
        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} First Look.
        </p>
      </div>
    </footer>
  );
}
