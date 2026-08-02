import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeddingSiteView } from "@/components/website/WeddingSiteView";
import {
  parseExternalRegistryLinks,
  type ExternalRegistryLink,
} from "@/components/website/registry/types";
import { parseWeddingWebsiteContent } from "@/components/website/types";
import { createAnonServerClient } from "@/utils/supabase/anon-server";
import {
  RsvpForm,
  type PublicMealOption,
  type PublicMealServiceStyle,
  type PublicRsvpAccessMode,
} from "./RsvpForm";

export const dynamic = "force-dynamic";

function parseMealServiceStyle(value: unknown): PublicMealServiceStyle {
  if (
    value === "none" ||
    value === "plated" ||
    value === "buffet" ||
    value === "family_style" ||
    value === "stations"
  ) {
    return value;
  }
  return "none";
}

function parseRsvpAccessMode(value: unknown): PublicRsvpAccessMode {
  return value === "gated" ? "gated" : "open";
}

async function loadPublishedWebsite(slug: string) {
  const supabase = createAnonServerClient();

  const { data: row, error } = await supabase
    .from("wedding_websites")
    .select(
      "content, template, theme, meal_service_style, rsvp_access_mode, project_id, external_registry_links",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const projectId = String(row.project_id);
  const mealServiceStyle = parseMealServiceStyle(row.meal_service_style);
  const rsvpAccessMode = parseRsvpAccessMode(row.rsvp_access_mode);
  const externalRegistryLinks: ExternalRegistryLink[] =
    parseExternalRegistryLinks(row.external_registry_links);

  const { data: optionRows } = await supabase
    .from("meal_options")
    .select("id, name, is_kids, sort_order, created_at")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const mealOptions: PublicMealOption[] = (optionRows ?? []).map((option) => ({
    id: String(option.id),
    name: String(option.name),
    is_kids: Boolean(option.is_kids),
  }));

  return {
    content: parseWeddingWebsiteContent(row.content),
    template: String(row.template),
    theme: String(row.theme),
    mealServiceStyle,
    rsvpAccessMode,
    mealOptions,
    externalRegistryLinks,
  };
}

function metadataDescription(content: ReturnType<typeof parseWeddingWebsiteContent>): string | undefined {
  const tagline = content.hero.tagline.trim();
  if (tagline) return tagline;

  const story = content.story.body.trim();
  if (story) {
    return story.length > 160 ? `${story.slice(0, 157)}…` : story;
  }

  return undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadPublishedWebsite(slug);

  if (!site) {
    return { title: "Wedding" };
  }

  const names = site.content.hero.names.trim() || "Wedding";

  return {
    title: names,
    description: metadataDescription(site.content),
  };
}

export default async function PublicWeddingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ g?: string }>;
}) {
  const { slug } = await params;
  const { g: guestToken } = await searchParams;
  const site = await loadPublishedWebsite(slug);

  if (!site) {
    notFound();
  }

  return (
    <WeddingSiteView
      content={site.content}
      template={site.template}
      theme={site.theme}
      externalRegistryLinks={site.externalRegistryLinks}
      rsvpSlot={
        <RsvpForm
          slug={slug}
          mealServiceStyle={site.mealServiceStyle}
          mealOptions={site.mealOptions}
          rsvpAccessMode={site.rsvpAccessMode}
          initialGuestToken={guestToken ?? null}
          appearance="on-dark"
        />
      }
    />
  );
}
