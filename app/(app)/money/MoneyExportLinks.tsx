import { buttonVariantClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { AccountPlan } from "@/lib/account-context";
import { getCopy } from "@/lib/venue-copy";

const exportLinkClass = cn(
  "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] px-4 py-2 text-[13px] font-semibold no-underline transition-[background,border-color,color] duration-150",
  buttonVariantClasses.default,
);

export function MoneyExportLinks({ plan }: { plan: AccountPlan }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a href="/money/export?kind=invoices" className={exportLinkClass}>
        {getCopy("moneyExportInvoices", plan)}
      </a>
      <a href="/money/export?kind=collections" className={exportLinkClass}>
        {getCopy("moneyExportCollections", plan)}
      </a>
    </div>
  );
}
