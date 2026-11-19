"use client";

import {
  deletePartner,
  savePartner,
  type PartnerInput,
} from "@/app/(admin)/admin/partners/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PARTNER_PLACEMENTS } from "@/lib/partners";
import { useState, useTransition } from "react";

export type PartnerRow = PartnerInput & { id: string; clicks30: number };

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3 py-2 text-[14px] font-medium text-ink placeholder:text-muted";

const EMPTY: PartnerInput = {
  slug: "",
  kind: "affiliate",
  partner_name: "",
  title: "",
  body: "",
  cta_label: "Learn more",
  url: "",
  image_url: "",
  placements: [],
  active: true,
  starts_on: "",
  ends_on: "",
  sort_order: 0,
};

function PartnerForm({
  id,
  initial,
  onDone,
}: {
  id: string | null;
  initial: PartnerInput;
  onDone: () => void;
}) {
  const [v, setV] = useState<PartnerInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof PartnerInput>(k: K, val: PartnerInput[K]) => setV((cur) => ({ ...cur, [k]: val }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await savePartner(id, v);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  const label = "text-[12.5px] font-semibold text-ink";
  return (
    <div className="grid gap-3 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed md:grid-cols-2">
      <label>
        <span className={label}>Type</span>
        <select value={v.kind} onChange={(e) => set("kind", e.target.value as PartnerInput["kind"])} className={fieldClass}>
          <option value="affiliate">Affiliate (we may earn a commission)</option>
          <option value="sponsor">Sponsor (labeled Sponsored)</option>
        </select>
      </label>
      <label>
        <span className={label}>Partner name</span>
        <input value={v.partner_name} onChange={(e) => set("partner_name", e.target.value)} placeholder="e.g. Minted" className={fieldClass} />
      </label>
      <label className="md:col-span-2">
        <span className={label}>Card title</span>
        <input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Save-the-dates that match your website" className={fieldClass} />
      </label>
      <label className="md:col-span-2">
        <span className={label}>One line about it (optional)</span>
        <input value={v.body} onChange={(e) => set("body", e.target.value)} className={fieldClass} />
      </label>
      <label className="md:col-span-2">
        <span className={label}>Destination (your affiliate / tracking link, https)</span>
        <input value={v.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" className={fieldClass} />
      </label>
      <label>
        <span className={label}>Button text</span>
        <input value={v.cta_label} onChange={(e) => set("cta_label", e.target.value)} className={fieldClass} />
      </label>
      <label>
        <span className={label}>Slug (for /go/slug and [[partner:slug]])</span>
        <input value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from title" className={fieldClass} />
      </label>
      <label className="md:col-span-2">
        <span className={label}>Image URL (optional, https, square works best)</span>
        <input value={v.image_url} onChange={(e) => set("image_url", e.target.value)} className={fieldClass} />
      </label>
      <fieldset className="md:col-span-2">
        <legend className={label}>Show on</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PARTNER_PLACEMENTS.map((p) => {
            const on = v.placements.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set("placements", on ? v.placements.filter((x) => x !== p.id) : [...v.placements, p.id])
                }
                className={cn(
                  "rounded-[var(--radius-pill)] border px-3 py-1 text-[12.5px] font-semibold",
                  on ? "border-accent bg-accent-wash text-accent" : "border-hairline bg-surface text-ink",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[12px] text-muted">Leave all off to use it only inside articles with [[partner:slug]].</p>
      </fieldset>
      <label>
        <span className={label}>Starts (optional)</span>
        <input type="date" value={v.starts_on} onChange={(e) => set("starts_on", e.target.value)} className={fieldClass} />
      </label>
      <label>
        <span className={label}>Ends (optional)</span>
        <input type="date" value={v.ends_on} onChange={(e) => set("ends_on", e.target.value)} className={fieldClass} />
      </label>
      <label>
        <span className={label}>Order (lower shows first)</span>
        <input type="number" value={v.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={fieldClass} />
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-[14px] font-semibold text-ink">
        <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--accent)]" />
        Active
      </label>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        {error ? <span className="text-[13px] font-medium text-rosewood">{error}</span> : null}
      </div>
    </div>
  );
}

export function PartnerManager({ rows }: { rows: PartnerRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <PartnerForm id={null} initial={EMPTY} onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing("new")}>Add partner</Button>
      )}

      <div className="rounded-[var(--radius-card)] bg-surface p-2 shadow-raised">
        {rows.length === 0 ? (
          <p className="p-5 text-[14px] text-muted">
            No partners yet. Add an affiliate link (Amazon, a registry, stationery…) or a sponsor card.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <li key={r.id} className="px-3 py-3">
                {editing === r.id ? (
                  <PartnerForm id={r.id} initial={r} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">
                        {r.partner_name} · {r.title}
                      </p>
                      <p className="text-[12.5px] text-muted">
                        /go/{r.slug} · {r.kind === "sponsor" ? "Sponsor" : "Affiliate"} ·{" "}
                        {r.placements.length ? `${r.placements.length} placement${r.placements.length === 1 ? "" : "s"}` : "articles only"} ·{" "}
                        <strong className="text-ink">{r.clicks30}</strong> clicks in 30 days
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-[var(--radius-pill)] px-3 py-1 text-[12px] font-semibold",
                          r.active ? "bg-sage-wash text-sage" : "bg-well text-muted",
                        )}
                      >
                        {r.active ? "Active" : "Off"}
                      </span>
                      <Button variant="default" onClick={() => setEditing(r.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-rosewood"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm(`Delete ${r.partner_name}? Its click history goes too.`)) {
                            startTransition(async () => {
                              await deletePartner(r.id);
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
