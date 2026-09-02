import { notFound, redirect } from "next/navigation";
import { InvoiceDetail } from "./InvoiceDetail";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { getInvoice } from "@/lib/invoices/actions";
import { projectWorkspaceEyebrow } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; invoiceId: string }>;
}) {
  const { projectId, invoiceId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (account?.kind !== "business") {
    redirect(`/projects/${projectId}`);
  }

  const [invoice, { data: project }] = await Promise.all([
    getInvoice(invoiceId),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  if (!invoice || invoice.project_id !== projectId) {
    notFound();
  }

  const eyebrow = projectWorkspaceEyebrow(
    project?.name ?? "Wedding",
    project?.wedding_date ?? null,
  );

  return (
    <div className={sectionStackClass("business")}>
      <PageHeader
        eyebrow={eyebrow}
        title={invoice.client_name?.trim() || "Invoice"}
        description="Edit the draft, add a payment link, then send. First Look never sees the payment."
      />
      <InvoiceDetail invoice={invoice} />
    </div>
  );
}
