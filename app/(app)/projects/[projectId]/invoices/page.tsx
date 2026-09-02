import { redirect } from "next/navigation";
import { InvoiceList } from "./InvoiceList";
import { NewInvoiceForm } from "./NewInvoiceForm";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { listProjectInvoices } from "@/lib/invoices/actions";
import { projectWorkspaceEyebrow } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (account?.kind !== "business") {
    redirect(`/projects/${projectId}`);
  }

  const stackClass = sectionStackClass("business");

  const [{ data: project }, invoices] = await Promise.all([
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
    listProjectInvoices(projectId),
  ]);

  const projectName = project?.name ?? "Wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow = projectWorkspaceEyebrow(projectName, weddingDate);

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Invoices"
        description="Bill a client with a public link. Payment happens off First Look."
      />

      <Card className="p-6">
        <h2 className="font-display text-[19px] tracking-[-0.02em] text-ink">
          New invoice
        </h2>
        <div className="mt-4">
          <NewInvoiceForm projectId={projectId} />
        </div>
      </Card>

      <InvoiceList projectId={projectId} invoices={invoices} />
    </div>
  );
}
