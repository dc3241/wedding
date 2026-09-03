"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import type { AdminAutomationPrompt, AdminAutomationRun } from "@/lib/admin/types";
import { useState, useTransition } from "react";
import {
  createPrompt,
  deletePrompt,
  deleteRun,
  setRunSavedToBank,
  updatePrompt,
  type PromptInput,
} from "@/app/(admin)/admin/automations/actions";

const EMPTY_PROMPT: PromptInput = {
  name: "",
  description: null,
  prompt_template: "",
  is_manual_trigger: true,
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PromptForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: PromptInput;
  onCancel: () => void;
  onSubmit: (input: PromptInput) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <h2 id="prompt-form-title" className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        {initial.name ? "Edit prompt" : "New prompt"}
      </h2>
      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Name
        </label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Weekly content-day batch"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Description
        </label>
        <Input
          value={form.description ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value || null }))
          }
          placeholder="What this prompt is for"
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Prompt template
        </label>
        <Textarea
          value={form.prompt_template}
          onChange={(e) => setForm((f) => ({ ...f, prompt_template: e.target.value }))}
          rows={10}
          required
          className="font-mono text-[14px]"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="default" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save prompt"}
        </Button>
      </div>
    </form>
  );
}

function RunPrompt({ prompt }: { prompt: AdminAutomationPrompt }) {
  const [inputText, setInputText] = useState("");
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: prompt.id, inputText }),
      });
      const data = (await res.json()) as { output?: string; error?: string };
      if (!res.ok) {
        setResult({ ok: false, text: data.error ?? "Run failed." });
      } else {
        setResult({ ok: true, text: data.output ?? "" });
      }
    } catch {
      setResult({ ok: false, text: "Network error reaching the automation route." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="border-t border-hairline pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[14px] font-semibold text-accent hover:underline"
      >
        {open ? "Hide run panel" : "Run…"}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Optional extra context for this run (topic, week, angle…)"
            rows={2}
          />
          <Button variant="primary" onClick={handleRun} disabled={running}>
            {running ? "Running…" : "Run automation"}
          </Button>
          {result ? (
            <div
              className={
                result.ok
                  ? "rounded-[var(--radius-inner)] bg-well px-3.5 py-3 text-[15px] font-medium whitespace-pre-wrap text-ink"
                  : "rounded-[var(--radius-inner)] bg-rosewood-wash px-3.5 py-3 text-[15px] font-medium text-rosewood"
              }
            >
              {result.text}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AutomationsBoard({
  prompts,
  runs,
}: {
  prompts: AdminAutomationPrompt[];
  runs: AdminAutomationRun[];
}) {
  const [localPrompts, setLocalPrompts] = useState(prompts);
  const [localRuns, setLocalRuns] = useState(runs);
  const [editing, setEditing] = useState<AdminAutomationPrompt | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  function promptName(id: string | null) {
    return localPrompts.find((p) => p.id === id)?.name ?? "Deleted prompt";
  }

  function handleSubmit(input: PromptInput) {
    if (editing === "new" || editing === null) {
      startTransition(async () => {
        await createPrompt(input);
        setEditing(null);
      });
    } else {
      const id = editing.id;
      setLocalPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...input } : p)));
      startTransition(async () => {
        await updatePrompt(id, input);
        setEditing(null);
      });
    }
  }

  function handleDeletePrompt(id: string) {
    setLocalPrompts((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await deletePrompt(id);
    });
  }

  function handleToggleSaved(runId: string, current: boolean) {
    setLocalRuns((prev) =>
      prev.map((r) => (r.id === runId ? { ...r, saved_to_bank: !current } : r)),
    );
    startTransition(async () => {
      await setRunSavedToBank(runId, !current);
    });
  }

  function handleDeleteRun(runId: string) {
    setLocalRuns((prev) => prev.filter((r) => r.id !== runId));
    startTransition(async () => {
      await deleteRun(runId);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Prompts
        </h2>
        <Button variant="primary" onClick={() => setEditing("new")}>
          + New prompt
        </Button>
      </div>

      {localPrompts.length === 0 ? (
        <EmptyState className="mb-6">No automation prompts yet.</EmptyState>
      ) : (
        <div className="mb-8 grid gap-3 md:grid-cols-2">
          {localPrompts.map((prompt) => (
            <Card key={prompt.id} className="px-5 py-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="text-[15px] font-medium text-ink">{prompt.name}</div>
                <div className="flex shrink-0 gap-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setEditing(prompt)}
                    className="font-medium text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(prompt.id)}
                    className="font-medium text-rosewood hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {prompt.description ? (
                <p className="mb-3 text-[13px] text-muted">{prompt.description}</p>
              ) : null}
              <RunPrompt prompt={prompt} />
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Recent runs
      </h2>
      {localRuns.length === 0 ? (
        <EmptyState>No runs yet — run a prompt above to see it here.</EmptyState>
      ) : (
        <div className="space-y-3">
          {localRuns.map((run) => (
            <Card key={run.id} className="px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-ink">
                    {promptName(run.prompt_id)}
                  </span>
                  <Pill
                    variant={
                      run.status === "completed"
                        ? "sage"
                        : run.status === "error"
                          ? "rosewood"
                          : "default"
                    }
                  >
                    {run.status}
                  </Pill>
                  {run.saved_to_bank ? <Pill variant="accent">Saved to bank</Pill> : null}
                </div>
                <span className="text-[13px] text-muted">{formatWhen(run.created_at)}</span>
              </div>
              {run.input_text ? (
                <p className="mb-2 text-[13px] text-muted italic">Context: {run.input_text}</p>
              ) : null}
              {run.output_text ? (
                <p className="mb-3 line-clamp-6 rounded-[var(--radius-inner)] bg-well px-3.5 py-3 text-[15px] font-medium whitespace-pre-wrap text-ink">
                  {run.output_text}
                </p>
              ) : null}
              {run.error_message ? (
                <p className="mb-3 text-[13px] text-rosewood">{run.error_message}</p>
              ) : null}
              <div className="flex gap-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => handleToggleSaved(run.id, run.saved_to_bank)}
                  className="font-medium text-accent hover:underline"
                >
                  {run.saved_to_bank ? "Mark not saved" : "Mark saved to bank"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRun(run.id)}
                  className="font-medium text-rosewood hover:underline"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== null ? (
        <Modal onClose={() => setEditing(null)} labelledBy="prompt-form-title">
          <PromptForm
            initial={editing === "new" ? EMPTY_PROMPT : editing}
            onCancel={() => setEditing(null)}
            onSubmit={handleSubmit}
            submitting={isPending}
          />
        </Modal>
      ) : null}
    </div>
  );
}
