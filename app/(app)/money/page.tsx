import { redirect } from "next/navigation";
import { MoneyBoard } from "./MoneyBoard";
import { MoneyExportLinks } from "./MoneyExportLinks";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { listAccountInvoices } from "@/lib/invoices/actions";
import { buildMoneySummary } from "@/lib/invoices/summary";
import { getCopy } from "@/lib/venue-copy";
import { createClient } from "@/utils/supabase/server";

export default async function MoneyPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  if (account.kind === "personal") {
    if (account.singleProjectId) {
      redirect(`/projects/${account.singleProjectId}`);
    }
    redirect("/projects");
  }

  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    redirect("/projects");
  }

  const invoices = await listAccountInvoices(accountId);
  const summary = buildMoneySummary(invoices);

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="Studio"
          title={getCopy("moneyTitle", account.plan)}
          description={getCopy("moneyDescription", account.plan)}
          actions={
            invoices.length > 0 ? (
              <MoneyExportLinks plan={account.plan} />
            ) : null
          }
        />
      </div>
      <MoneyBoard summary={summary} plan={account.plan} />
    </div>
  );
}
