import { ArticleDraftForm } from "@/components/admin/article-draft-form";
import { PageHeader } from "@/components/ui/page-header";
import { pillarLabel } from "@/lib/articles/pillars";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const maxDuration = 120;

type Row = {
  id: string;
  title: string;
  slug: string;
  pillar: string;
  status: string;
  updated_at: string;
};

export default async function AdminArticlesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, pillar, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Articles"
        description="The Ideas section of the public site. Draft from a topic, edit, then publish."
      />
      <ArticleDraftForm />
      <div className="mt-6 rounded-[var(--radius-card)] bg-surface p-2 shadow-raised">
        {rows.length === 0 ? (
          <p className="p-5 text-[14px] text-muted">No articles yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/articles/${r.id}`}
                  className="flex items-center justify-between gap-4 rounded-[var(--radius-inner)] px-4 py-3 no-underline hover:bg-well"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-ink">{r.title}</span>
                    <span className="block text-[12.5px] text-muted">
                      {pillarLabel(r.pillar)} · /ideas/{r.slug}
                    </span>
                  </span>
                  <span
                    className={
                      r.status === "published"
                        ? "shrink-0 rounded-[var(--radius-pill)] bg-sage-wash px-3 py-1 text-[12px] font-semibold text-sage"
                        : "shrink-0 rounded-[var(--radius-pill)] bg-well px-3 py-1 text-[12px] font-semibold text-muted"
                    }
                  >
                    {r.status === "published" ? "Published" : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
