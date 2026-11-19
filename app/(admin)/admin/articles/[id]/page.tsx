import { ArticleEditor } from "@/components/admin/article-editor";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, dek, body, pillar, status")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div>
      <Link href="/admin/articles" className="text-[13px] font-medium text-muted no-underline hover:text-ink">
        ← All articles
      </Link>
      <ArticleEditor
        article={{
          id: data.id,
          title: data.title,
          slug: data.slug,
          dek: data.dek ?? "",
          body: data.body,
          pillar: data.pillar,
          published: data.status === "published",
        }}
      />
    </div>
  );
}
