import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  VendorLibraryDetail,
  type LibraryDetailVendor,
} from "@/components/vendors/VendorLibraryDetail";
import {
  VendorPortfolioGallery,
  type PortfolioPhoto,
} from "@/components/vendors/VendorPortfolioGallery";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { vendorStatusPill } from "@/components/vendors/vendor-status";
import {
  VENDOR_MEDIA_BUCKET,
  VENDOR_MEDIA_SIGNED_TTL_SECONDS,
} from "@/app/(app)/vendors/vendor-media-shared";
import { getAccountContext } from "@/lib/account-context";
import { formatCurrency } from "@/lib/format-currency";
import { createClient } from "@/utils/supabase/server";

type UsageRow = {
  id: string;
  project_id: string;
  status: string;
  quoted_price: number | null;
  role: string | null;
  projects: { name: string } | { name: string }[] | null;
};

function projectName(projects: UsageRow["projects"]): string {
  if (!projects) return "Wedding";
  const row = Array.isArray(projects) ? projects[0] : projects;
  return row?.name?.trim() || "Wedding";
}

async function listVendorPortfolioPhotos(
  accountId: string,
  vendorId: string,
): Promise<PortfolioPhoto[]> {
  const supabase = await createClient();
  const folder = `${accountId}/${vendorId}`;

  const { data: objects, error } = await supabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });

  if (error || !objects) {
    return [];
  }

  const files = objects.filter(
    (obj) =>
      Boolean(obj.name) &&
      !obj.name.endsWith("/") &&
      obj.name !== ".emptyFolderPlaceholder" &&
      obj.id !== null,
  );

  const photos: PortfolioPhoto[] = [];
  for (const file of files) {
    const path = `${folder}/${file.name}`;
    const { data, error: signError } = await supabase.storage
      .from(VENDOR_MEDIA_BUCKET)
      .createSignedUrl(path, VENDOR_MEDIA_SIGNED_TTL_SECONDS);

    if (signError || !data?.signedUrl) continue;
    photos.push({ path, url: data.signedUrl });
  }

  return photos;
}

export default async function VendorLibraryDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
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

  const [{ data: vendorRow }, { data: usageRows }] = await Promise.all([
    supabase
      .from("vendors")
      .select(
        "id, account_id, name, category, contact_name, contact_email, contact_phone, website, service_area, address, notes, is_preferred, source, ai_overview, last_enriched_at, instagram",
      )
      .eq("id", vendorId)
      .maybeSingle(),
    supabase
      .from("project_vendors")
      .select("id, project_id, status, quoted_price, role, projects(name)")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: true }),
  ]);

  if (!vendorRow) {
    notFound();
  }

  const photos = await listVendorPortfolioPhotos(
    vendorRow.account_id,
    vendorRow.id,
  );

  const vendor: LibraryDetailVendor = {
    id: vendorRow.id,
    name: vendorRow.name,
    category: vendorRow.category,
    contact_name: vendorRow.contact_name,
    contact_email: vendorRow.contact_email,
    contact_phone: vendorRow.contact_phone,
    website: vendorRow.website,
    service_area: vendorRow.service_area,
    address: vendorRow.address,
    notes: vendorRow.notes,
    is_preferred: vendorRow.is_preferred,
    source: vendorRow.source,
    ai_overview: vendorRow.ai_overview,
    last_enriched_at: vendorRow.last_enriched_at,
    instagram: vendorRow.instagram,
  };

  const usage = ((usageRows ?? []) as UsageRow[]).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: projectName(row.projects),
    status: row.status,
    quotedPrice:
      row.quoted_price === null || row.quoted_price === undefined
        ? null
        : Number(row.quoted_price),
    role: row.role,
  }));

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <Link
        href="/vendors"
        className="mb-3 inline-block text-[13px] text-muted no-underline hover:text-ink"
      >
        ← Back to vendor library
      </Link>

      <VendorLibraryDetail vendor={vendor} />

      <div className="mt-6">
        <VendorPortfolioGallery
          accountId={vendorRow.account_id}
          vendorId={vendor.id}
          photos={photos}
        />
      </div>

      <Card className="mt-6 p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          Used on
        </p>

        {usage.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">
            Not used on any wedding yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {usage.map((item) => {
              const { variant, label } = vendorStatusPill(item.status);
              const meta = [
                item.quotedPrice !== null
                  ? formatCurrency(item.quotedPrice)
                  : null,
                item.role?.trim() || null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.projectId}/vendors/${vendor.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-[15px] font-medium text-ink no-underline shadow-recessed transition-colors hover:text-accent"
                  >
                    <span className="min-w-0 truncate">{item.projectName}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Pill variant={variant}>{label}</Pill>
                      {meta ? (
                        <span className="text-[13px] font-normal text-muted tabular-nums">
                          {meta}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
