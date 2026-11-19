"use client";

import { createBlankArticle, createDraftFromTopic } from "@/app/(admin)/admin/articles/actions";
import { Button } from "@/components/ui/button";
import { ARTICLE_PILLARS } from "@/lib/articles/pillars";
import { useState, useTransition } from "react";

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

export function ArticleDraftForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createDraftFromTopic(fd);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised">
      <h2 className="text-[16px] font-bold text-ink">Draft an article</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        Give a topic and the assistant writes a first draft. Nothing is public until you publish.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto_auto]">
        <input
          name="topic"
          required
          maxLength={300}
          placeholder="e.g. How to cut your guest list without drama"
          className={fieldClass}
        />
        <select name="pillar" defaultValue="planning" className={fieldClass}>
          {ARTICLE_PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Drafting… (up to a minute)" : "Draft it"}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={pending}
          onClick={() => startTransition(() => createBlankArticle())}
        >
          Blank article
        </Button>
      </div>
      {error ? <p className="mt-3 text-[13.5px] font-medium text-rosewood">{error}</p> : null}
    </form>
  );
}
