import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicRegistryView } from "@/components/website/registry/PublicRegistryView";
import {
  parseExternalRegistryLinks,
  type PublicRegistryItem,
} from "@/components/website/registry/types";
import { parseWeddingWebsiteContent } from "@/components/website/types";
import { WeddingSiteView } from "@/components/website/WeddingSiteView";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export const dynamic = "force-dynamic";

async function loadPublishedRegistry(slug: string) {
  const supabase = createAnonServerClient();

  const { data: site, error: siteError } = await supabase
    .from("wedding_websites")
    .select(
      "project_id, content, template, theme, external_registry_links",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (siteError || !site) {
    return null;
  }

  const projectId = String(site.project_id);

  const [{ data: rows }, { data: availabilityRows }] = await Promise.all([
    supabase
      .from("registry_items")
      .select(
        "id, name, price, image_url, buy_url, quantity_wanted, note, created_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase.rpc("registry_item_availability", {
      p_project_id: projectId,
    }),
  ]);

  const claimedByItem = new Map<string, number>();
  for (const row of availabilityRows ?? []) {
    claimedByItem.set(
      String(row.registry_item_id),
      Number(row.claimed_qty) || 0,
    );
  }

  const items: PublicRegistryItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    price:
      row.price === null || row.price === undefined ? null : Number(row.price),
    imageUrl: row.image_url,
    buyUrl: row.buy_url,
    quantityWanted: Number(row.quantity_wanted),
    note: row.note,
    claimedQty: claimedByItem.get(row.id) ?? 0,
  }));

  return {
    content: parseWeddingWebsiteContent(site.content),
    template: String(site.template),
    theme: String(site.theme),
    items,
    externalLinks: parseExternalRegistryLinks(site.external_registry_links),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadPublishedRegistry(slug);

  if (!site) {
    return { title: "Registry" };
  }

  const names = site.content.hero.names.trim() || "Wedding";
  return { title: `${names} · Registry` };
}

export default async function PublicRegistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await loadPublishedRegistry(slug);

  if (!site) {
    notFound();
  }

  if (!site.content.registry.visible) {
    notFound();
  }

  return (
    <WeddingSiteView
      content={site.content}
      template={site.template}
      theme={site.theme}
      homeHref={`/w/${slug}`}
      registryHref={`/w/${slug}/registry`}
      pageSlot={
        <PublicRegistryView
          slug={slug}
          items={site.items}
          externalLinks={site.externalLinks}
        />
      }
    />
  );
}
