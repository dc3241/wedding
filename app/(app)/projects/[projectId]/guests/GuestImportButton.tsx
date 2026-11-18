"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { ImportHousehold } from "@/lib/guests/import-parse";
import { importGuestHouseholds, organizeGuestImport } from "./import-actions";

const METHOD_NOTE: Record<"table" | "assistant" | "lines", string> = {
  table: "Read from your spreadsheet columns.",
  assistant: "Organized into households by the assistant. Check it over.",
  lines: "One line became one household. Check it over.",
};

/** GUEST-IMPORT-01 — paste or upload a list, preview households, save. */
export function GuestImportButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="text-[13px] !px-3.5 !py-2"
        onClick={() => setOpen(true)}
      >
        Import guests
      </Button>
      {open ? <GuestImportModal projectId={projectId} onClose={close} /> : null}
    </>
  );
}

function GuestImportModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [households, setHouseholds] = useState<ImportHousehold[] | null>(null);
  const [method, setMethod] = useState<"table" | "assistant" | "lines">("lines");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("That file is too large. Export it as a CSV under 2 MB.");
      return;
    }
    setError(null);
    setFileName(file.name);
    setText(await file.text());
  }

  function organize() {
    startTransition(async () => {
      setError(null);
      const result = await organizeGuestImport(projectId, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMethod(result.method);
      setHouseholds(result.households);
    });
  }

  function save() {
    if (!households) return;
    startTransition(async () => {
      setError(null);
      const result = await importGuestHouseholds(projectId, households);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(
        `Added ${result.people} ${result.people === 1 ? "guest" : "guests"} in ${result.households} ${result.households === 1 ? "household" : "households"}.`,
      );
      router.refresh();
    });
  }

  const peopleCount = households?.reduce((n, h) => n + h.people.length, 0) ?? 0;

  return (
    <Modal onClose={onClose} labelledBy="guest-import-title" panelClassName="max-w-2xl">
      <h2 id="guest-import-title" className="text-[20px] font-medium text-ink">
        Import guests
      </h2>

      {done ? (
        <>
          <p className="mt-3 text-[15px] text-sage" role="status">
            {done}
          </p>
          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </>
      ) : households === null ? (
        <>
          <p className="mt-1 text-[14px] text-muted">
            Paste your list (from Notes, a doc, or a spreadsheet) or choose a
            CSV. Write people who are invited together on one line, like
            &ldquo;Ann &amp; Bob Lee&rdquo; or &ldquo;Uncle Joe +1&rdquo;.
          </p>
          <Textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFileName(null);
            }}
            rows={10}
            placeholder={"Ann & Bob Lee, ann@example.com\nUncle Joe +1\nThe Smiths: Mary, John, Timmy (kid)"}
            className="mt-4 resize-y font-mono text-[13px]"
            disabled={isPending}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-[13px] font-semibold text-accent hover:opacity-80">
              Choose a CSV file
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/plain"
                className="sr-only"
                onChange={(event) => onFile(event.target.files?.[0])}
              />
            </label>
            {fileName ? (
              <span className="text-[13px] text-muted">{fileName}</span>
            ) : null}
            <span className="ml-auto" />
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={organize}
              disabled={isPending || !text.trim()}
            >
              {isPending ? "Organizing…" : "Organize list"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-muted">
            {households.length} {households.length === 1 ? "household" : "households"},{" "}
            {peopleCount} {peopleCount === 1 ? "person" : "people"}. {METHOD_NOTE[method]}{" "}
            Remove anything that shouldn&apos;t be here.
          </p>
          <ul className="mt-4 space-y-2">
            {households.map((household, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-2.5 shadow-recessed"
              >
                <div className="min-w-0 flex-1">
                  {household.label ? (
                    <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                      {household.label}
                    </p>
                  ) : null}
                  <p className="text-[14px] text-ink">
                    {household.people.map((person, i) => (
                      <span key={i}>
                        {i > 0 ? ", " : ""}
                        {person.name}
                        {person.type === "child" ? (
                          <span className="text-muted"> (child)</span>
                        ) : person.type === "plus_one" && person.name === "Guest" ? null : person.type === "plus_one" ? (
                          <span className="text-muted"> (guest)</span>
                        ) : null}
                      </span>
                    ))}
                  </p>
                  {household.email || household.phone || household.address ? (
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {[household.email, household.phone, household.address]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${household.people[0]?.name ?? "household"}`}
                  className="shrink-0 rounded-[var(--radius-inner)] px-2 py-1 text-[13px] text-muted hover:text-rosewood"
                  onClick={() =>
                    setHouseholds((prev) => prev?.filter((_, i) => i !== index) ?? null)
                  }
                  disabled={isPending}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setHouseholds(null)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={isPending || households.length === 0}
            >
              {isPending
                ? "Adding…"
                : `Add ${peopleCount} ${peopleCount === 1 ? "guest" : "guests"}`}
            </Button>
          </div>
        </>
      )}

      {error ? (
        <p className="mt-3 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
