import { redirect } from "next/navigation";
import { AccountInvoiceBoard } from "./AccountInvoiceBoard";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { listAccountInvoices } from "@/lib/invoices/actions";
import { getCopy } from "@/lib/venue-copy";
import { createClient } from "@/utils/supabase/server";

export default async function AccountInvoicesPage() {
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

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="Studio"
          title={getCopy("invoicesTitle", account.plan)}
          description={getCopy("invoicesDescription", account.plan)}
        />
      </div>
      <AccountInvoiceBoard invoices={invoices} plan={account.plan} />
    </div>
  );
}
