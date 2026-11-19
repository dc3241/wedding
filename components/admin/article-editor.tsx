"use client";

import {
  deleteArticle,
  saveArticle,
  setArticlePublished,
} from "@/app/(admin)/admin/articles/actions";
import { ArticleBody } from "@/components/articles/article-body";
import { Button } from "@/components/ui/button";
import { ARTICLE_PILLARS } from "@/lib/articles/pillars";
import { cn } from "@/lib/cn";
import { useState, useTransition } from "react";

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

type EditorArticle = {
  id: string;
  title: string;
  slug: string;
  dek: string;
  body: string;
  pillar: string;
  published: boolean;
};

export function ArticleEditor({ article }: { article: EditorArticle }) {
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [dek, setDek] = useState(article.dek);
  const [body, setBody] = useState(article.body);
  const [pillar, setPillar] = useState(article.pillar);
  const [published, setPublished] = useState(article.published);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(then?: (savedSlug: string) => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      const res = await saveArticle(article.id, { title, slug, dek, body, pillar });
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setSlug(res.slug);
      if (then) await then(res.slug);
      else setMessage({ ok: true, text: "Saved." });
    });
  }

  function togglePublish() {
    save(async () => {
      const res = await setArticlePublished(article.id, !published);
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setPublished(!published);
      setMessage({ ok: true, text: published ? "Moved back to draft." : "Published." });
    });
  }

  return (
    <div className="mt-4 grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={cn(
            "rounded-[var(--radius-pill)] px-3 py-1 text-[12px] font-semibold",
            published ? "bg-sage-wash text-sage" : "bg-well text-muted",
          )}
        >
          {published ? "Published" : "Draft"}
        </span>
        <div className="flex flex-wrap gap-2">
          {published ? (
            <a
              href={`/ideas/${slug}`}
              target="_blank"
              rel="noopener"
              className="rounded-[var(--radius-pill)] border-[1.5px] border-hairline bg-surface px-5 py-2.5 text-[14px] font-semibold text-ink no-underline hover:border-accent"
            >
              View live
            </a>
          ) : null}
          <Button variant="default" disabled={pending} onClick={() => save()}>
            Save
          </Button>
          <Button disabled={pending} onClick={togglePublish}>
            {published ? "Unpublish" : "Save & publish"}
          </Button>
        </div>
      </div>
      {message ? (
        <p className={cn("text-[13.5px] font-medium", message.ok ? "text-sage" : "text-rosewood")}>
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-raised md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="text-[13px] font-semibold text-ink">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={cn(fieldClass, "mt-1")} />
        </label>
        <label>
          <span className="text-[13px] font-semibold text-ink">URL slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={cn(fieldClass, "mt-1")} />
        </label>
        <label>
          <span className="text-[13px] font-semibold text-ink">Section</span>
          <select value={pillar} onChange={(e) => setPillar(e.target.value)} className={cn(fieldClass, "mt-1")}>
            {ARTICLE_PILLARS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="text-[13px] font-semibold text-ink">
            Summary <span className="font-normal text-muted">(meta description, {dek.length}/160)</span>
          </span>
          <input value={dek} onChange={(e) => setDek(e.target.value)} className={cn(fieldClass, "mt-1")} />
        </label>
      </div>

      <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised">
        <div className="mb-3 flex gap-2">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                "rounded-[var(--radius-pill)] border px-4 py-1.5 text-[13.5px] font-semibold capitalize",
                tab === t ? "border-accent bg-accent-wash text-accent" : "border-hairline text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "write" ? (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={28}
              className={cn(fieldClass, "font-mono text-[14px] leading-relaxed")}
            />
            <p className="mt-2 text-[12.5px] text-muted">
              ## Heading · ### Subheading · - bullet · 1. numbered · &gt; tip · **bold** · *italic* ·
              [label](/plan) · [[partner:slug]] on its own line (shows on the live page)
            </p>
          </>
        ) : (
          <div className="mx-auto max-w-[720px] py-2">
            <h1 className="mb-6 text-[34px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
            <ArticleBody source={body} />
          </div>
        )}
      </div>

      <div>
        <Button
          variant="ghost"
          className="text-rosewood"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Delete this article? This can't be undone.")) {
              startTransition(() => deleteArticle(article.id));
            }
          }}
        >
          Delete article
        </Button>
      </div>
    </div>
  );
}
