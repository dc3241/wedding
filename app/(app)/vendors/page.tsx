import { redirect } from "next/navigation";
import { AddAccountVendorForm } from "@/components/vendors/AddAccountVendorForm";
import {
  VendorLibrary,
  type LibraryVendor,
} from "@/components/vendors/VendorLibrary";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { createClient } from "@/utils/supabase/server";

type VendorRow = {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  service_area: string | null;
  address: string | null;
  notes: string | null;
  is_preferred: boolean;
  project_vendors: { count: number }[] | null;
};

export default async function VendorLibraryPage() {
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

  const { data: rows } = await supabase
    .from("vendors")
    .select(
      "id, name, category, contact_name, contact_email, contact_phone, website, service_area, address, notes, is_preferred, project_vendors(count)",
    )
    .eq("account_id", accountId)
    .order("name", { ascending: true });

  const vendors: LibraryVendor[] = ((rows ?? []) as VendorRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    website: row.website,
    service_area: row.service_area,
    address: row.address,
    notes: row.notes,
    is_preferred: row.is_preferred,
    linkCount: row.project_vendors?.[0]?.count ?? 0,
  }));

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="Reference"
          title="Vendor library"
          description="Your book of preferred and known vendors across all clients."
          actions={<AddAccountVendorForm />}
        />
      </div>

      <VendorLibrary vendors={vendors} />
    </div>
  );
}
