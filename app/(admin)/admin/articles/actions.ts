"use server";

import { checkIsAdmin } from "@/lib/admin/is-admin";
import { draftArticle } from "@/lib/articles/draft";
import { isArticlePillar, slugifyTitle } from "@/lib/articles/pillars";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) throw new Error("Not authorized");
  return supabase;
}

function revalidatePublic(slug?: string) {
  revalidatePath("/admin/articles");
  revalidatePath("/ideas");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/ideas/${slug}`);
}

/** Make a slug unique by adding -2, -3… (drafts and published share one index). */
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = (slugifyTitle(base) || "article").slice(0, 110);
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    let q = supabase.from("articles").select("id").eq("slug", candidate).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    if (!data?.length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createBlankArticle() {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const slug = await uniqueSlug(supabase, "untitled");
  const { data, error } = await supabase
    .from("articles")
    .insert({ title: "Untitled article", slug, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/articles");
  redirect(`/admin/articles/${data.id}`);
}

export type DraftResult = { ok: false; error: string };

export async function createDraftFromTopic(formData: FormData): Promise<DraftResult> {
  const supabase = await requireAdmin();
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 300);
  const pillarRaw = String(formData.get("pillar") ?? "planning");
  const pillar = isArticlePillar(pillarRaw) ? pillarRaw : "planning";
  if (!topic) return { ok: false, error: "Add a topic first." };

  let draft;
  try {
    draft = await draftArticle(topic, pillar);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Draft failed." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const slug = await uniqueSlug(supabase, draft.slug);
  const { data, error } = await supabase
    .from("articles")
    .insert({
      title: draft.title,
      slug,
      dek: draft.dek || null,
      body: draft.body,
      pillar,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/articles");
  redirect(`/admin/articles/${data.id}`);
}

export type ArticleInput = {
  title: string;
  slug: string;
  dek: string;
  body: string;
  pillar: string;
};

export type SaveResult = { ok: true; slug: string } | { ok: false; error: string };

export async function saveArticle(id: string, input: ArticleInput): Promise<SaveResult> {
  const supabase = await requireAdmin();
  const title = input.title.trim().slice(0, 160);
  if (!title) return { ok: false, error: "Title is required." };
  if (!isArticlePillar(input.pillar)) return { ok: false, error: "Pick a section." };
  const slug = await uniqueSlug(supabase, input.slug.trim() || title, id);

  const { data: before } = await supabase.from("articles").select("slug").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("articles")
    .update({
      title,
      slug,
      dek: input.dek.trim().slice(0, 300) || null,
      body: input.body,
      pillar: input.pillar,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePublic(slug);
  if (before?.slug && before.slug !== slug) revalidatePath(`/ideas/${before.slug}`);
  return { ok: true, slug };
}

export async function setArticlePublished(id: string, publish: boolean): Promise<SaveResult> {
  const supabase = await requireAdmin();
  const { data: row, error: readError } = await supabase
    .from("articles")
    .select("slug, body, published_at")
    .eq("id", id)
    .maybeSingle();
  if (readError || !row) return { ok: false, error: readError?.message ?? "Article not found." };
  if (publish && !row.body.trim()) return { ok: false, error: "Add a body before publishing." };

  const { error } = await supabase
    .from("articles")
    .update(
      publish
        ? { status: "published", published_at: row.published_at ?? new Date().toISOString() }
        : { status: "draft" },
    )
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePublic(row.slug);
  return { ok: true, slug: row.slug };
}

export async function deleteArticle(id: string) {
  const supabase = await requireAdmin();
  const { data: row } = await supabase.from("articles").select("slug").eq("id", id).maybeSingle();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePublic(row?.slug);
  redirect("/admin/articles");
}
