import { RegistryBoard } from "./RegistryBoard";
import type { RegistryClaim, RegistryItem } from "./types";
import { parseExternalRegistryLinks } from "@/components/website/registry/types";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function RegistryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [{ data: rows }, { data: claimRows }, { data: project }, { data: website }] =
    await Promise.all([
      supabase
        .from("registry_items")
        .select(
          "id, name, price, image_url, buy_url, quantity_wanted, note, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("registry_claims")
        .select(
          "id, registry_item_id, quantity, status, claimer_name, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("wedding_websites")
        .select("external_registry_links")
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  const items: RegistryItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    price:
      row.price === null || row.price === undefined ? null : Number(row.price),
    image_url: row.image_url,
    buy_url: row.buy_url,
    quantity_wanted: Number(row.quantity_wanted),
    note: row.note,
    created_at: row.created_at,
  }));

  const claimsByItem: Record<string, RegistryClaim[]> = {};
  for (const row of claimRows ?? []) {
    const status =
      row.status === "purchased" || row.status === "reserved"
        ? row.status
        : "reserved";
    const claim: RegistryClaim = {
      id: row.id,
      registry_item_id: row.registry_item_id,
      quantity: Number(row.quantity) || 1,
      status,
      claimer_name: row.claimer_name,
      created_at: row.created_at,
    };
    const list = claimsByItem[claim.registry_item_id] ?? [];
    list.push(claim);
    claimsByItem[claim.registry_item_id] = list;
  }

  const externalLinks = parseExternalRegistryLinks(
    website?.external_registry_links,
  );

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className={stackClass}>
      <RegistryBoard
        projectId={projectId}
        eyebrow={eyebrow}
        items={items}
        claimsByItem={claimsByItem}
        externalLinks={externalLinks}
      />
    </div>
  );
}
