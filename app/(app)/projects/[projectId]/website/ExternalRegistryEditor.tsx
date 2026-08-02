"use client";

import { useState, useTransition } from "react";
import { setExternalRegistryLinks } from "./actions";
import { normalizeProductUrl } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type ExternalLinkRow = {
  label: string;
  url: string;
};

export function ExternalRegistryEditor({
  projectId,
  initialLinks,
}: {
  projectId: string;
  initialLinks: ExternalLinkRow[];
}) {
  const [rows, setRows] = useState<ExternalLinkRow[]>(
    initialLinks.length > 0 ? initialLinks : [],
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, field: keyof ExternalLinkRow, value: string) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setRows((current) => [...current, { label: "", url: "" }]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function handleSave() {
    setMessage(null);
    setError(null);

    const incomplete = rows.some(
      (row) => row.label.trim() && !row.url.trim(),
    );
    if (incomplete) {
      setError("Each link needs both a label and a URL.");
      return;
    }

    const invalidUrl = rows.some(
      (row) => row.url.trim() && !normalizeProductUrl(row.url),
    );
    if (invalidUrl) {
      setError("Use a valid http(s) URL for each link.");
      return;
    }

    startTransition(async () => {
      try {
        await setExternalRegistryLinks(projectId, rows);
        setMessage("Saved.");
      } catch {
        setMessage(null);
        setError(
          "Could not save. Create a wedding website first, then retry.",
        );
      }
    });
  }

  return (
    <Card className="p-5">
      <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        External registries
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Link out to Amazon, Zola, Target, and other registries. Shown on your
        published wedding website.
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <li
            key={index}
            className="grid gap-2 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed sm:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)_auto]"
          >
            <Input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(index, "label", e.target.value)}
              placeholder="Label (e.g. Amazon)"
              disabled={isPending}
              aria-label={`External registry label ${index + 1}`}
              className="bg-surface"
            />
            <Input
              type="url"
              value={row.url}
              onChange={(e) => updateRow(index, "url", e.target.value)}
              placeholder="https://"
              disabled={isPending}
              aria-label={`External registry URL ${index + 1}`}
              className="bg-surface"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => removeRow(index)}
              disabled={isPending}
              className="text-muted hover:text-rosewood"
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">No external links yet.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="default" onClick={addRow} disabled={isPending}>
          Add link
        </Button>
        <Button type="button" variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save links"}
        </Button>
        {error ? (
          <span className="text-[13px] font-medium text-rosewood">{error}</span>
        ) : null}
        {message ? (
          <span className="text-[13px] font-medium text-muted">{message}</span>
        ) : null}
      </div>
    </Card>
  );
}
