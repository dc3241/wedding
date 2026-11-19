"use server";

import { checkIsAdmin } from "@/lib/admin/is-admin";
import { slugifyTitle } from "@/lib/articles/pillars";
import { isPartnerPlacement } from "@/lib/partners";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) throw new Error("Not authorized");
  return supabase;
}

function revalidateSurfaces() {
  revalidatePath("/admin/partners");
  for (const p of ["/", "/plan", "/ideas", "/plan/venue-quiz", "/plan/wedding-cost-calculator", "/plan/wedding-alcohol-calculator"]) {
    revalidatePath(p);
  }
  revalidatePath("/ideas/[slug]", "page");
  revalidatePath("/wedding-vendors/[state]", "page");
}

export type PartnerInput = {
  slug: string;
  kind: "affiliate" | "sponsor";
  partner_name: string;
  title: string;
  body: string;
  cta_label: string;
  url: string;
  image_url: string;
  placements: string[];
  active: boolean;
  starts_on: string;
  ends_on: string;
  sort_order: number;
};

export type PartnerResult = { ok: true } | { ok: false; error: string };

function clean(input: PartnerInput) {
  const url = input.url.trim();
  if (!/^https:\/\/\S+$/.test(url)) return { error: "Destination must be an https:// link." } as const;
  const image = input.image_url.trim();
  if (image && !/^https:\/\/\S+$/.test(image)) return { error: "Image must be an https:// link." } as const;
  const slug = slugifyTitle(input.slug || input.title).slice(0, 80);
  if (!slug) return { error: "Add a slug or title." } as const;
  if (!input.partner_name.trim() || !input.title.trim()) return { error: "Partner name and title are required." } as const;
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    row: {
      slug,
      kind: input.kind === "sponsor" ? "sponsor" : "affiliate",
      partner_name: input.partner_name.trim().slice(0, 120),
      title: input.title.trim().slice(0, 140),
      body: input.body.trim().slice(0, 400) || null,
      cta_label: input.cta_label.trim().slice(0, 40) || "Learn more",
      url,
      image_url: image || null,
      placements: input.placements.filter(isPartnerPlacement),
      active: input.active,
      starts_on: date(input.starts_on),
      ends_on: date(input.ends_on),
      sort_order: Number.isFinite(input.sort_order) ? Math.round(input.sort_order) : 0,
      updated_at: new Date().toISOString(),
    },
  } as const;
}

export async function savePartner(id: string | null, input: PartnerInput): Promise<PartnerResult> {
  const supabase = await requireAdmin();
  const c = clean(input);
  if ("error" in c) return { ok: false, error: c.error ?? "Invalid." };
  const { error } = id
    ? await supabase.from("partner_links").update(c.row).eq("id", id)
    : await supabase.from("partner_links").insert(c.row);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("partner_links_slug_key") ? "That slug is taken." : error.message,
    };
  }
  revalidateSurfaces();
  return { ok: true };
}

export async function deletePartner(id: string): Promise<PartnerResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("partner_links").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateSurfaces();
  return { ok: true };
}
