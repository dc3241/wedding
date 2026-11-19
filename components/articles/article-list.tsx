"use client";

import { cn } from "@/lib/cn";
import { ARTICLE_PILLARS, pillarLabel } from "@/lib/articles/pillars";
import Link from "next/link";
import { useState } from "react";

export type ArticleCard = {
  slug: string;
  title: string;
  dek: string | null;
  pillar: string;
  date: string;
};

/** MEDIA-05: /ideas grid with a client-side topic filter. */
export function ArticleList({ articles }: { articles: readonly ArticleCard[] }) {
  const [pillar, setPillar] = useState<string>("");
  const present = ARTICLE_PILLARS.filter((p) => articles.some((a) => a.pillar === p.id));
  const shown = pillar ? articles.filter((a) => a.pillar === pillar) : articles;

  return (
    <div>
      {present.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          {[{ id: "", label: "All" }, ...present].map((p) => (
            <button
              key={p.id || "all"}
              type="button"
              aria-pressed={pillar === p.id}
              onClick={() => setPillar(p.id)}
              className={cn(
                "rounded-[var(--radius-pill)] border px-4 py-1.5 text-[13.5px] font-semibold transition-colors",
                pillar === p.id
                  ? "border-accent bg-accent-wash text-accent"
                  : "border-hairline bg-surface text-ink hover:border-accent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => (
          <li key={a.slug}>
            <ArticleTile article={a} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ArticleTile({ article }: { article: ArticleCard }) {
  return (
    <Link
      href={`/ideas/${article.slug}`}
      className="marketing-card-hover flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 no-underline shadow-raised"
    >
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">
        {pillarLabel(article.pillar)}
      </span>
      <span className="mt-2 text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
        {article.title}
      </span>
      {article.dek ? (
        <span className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{article.dek}</span>
      ) : (
        <span className="flex-1" />
      )}
      <span className="mt-3 text-[12.5px] text-muted">{article.date}</span>
    </Link>
  );
}
