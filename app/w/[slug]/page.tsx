import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeddingSiteView } from "@/components/website/WeddingSiteView";
import { parseWeddingWebsiteContent } from "@/components/website/types";
import { createAnonServerClient } from "@/utils/supabase/anon-server";
import { RsvpForm } from "./RsvpForm";

export const dynamic = "force-dynamic";

async function loadPublishedWebsite(slug: string) {
  const supabase = createAnonServerClient();

  const { data: row, error } = await supabase
    .from("wedding_websites")
    .select("content, template, theme")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  return {
    content: parseWeddingWebsiteContent(row.content),
    template: String(row.template),
    theme: String(row.theme),
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await loadPublishedWebsite(slug);

  if (!site) {
    notFound();
  }

  return (
    <WeddingSiteView
      content={site.content}
      template={site.template}
      theme={site.theme}
      rsvpSlot={<RsvpForm slug={slug} />}
    />
  );
}
