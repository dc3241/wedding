"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteContractTemplate,
  fillContractTemplate,
  generateContractTemplateDraft,
  listProjectVendorsForFill,
  type ContractTemplateRow,
  type FillVendorOption,
} from "./template-actions";
import { FilledTemplateDocument } from "./FilledTemplateDocument";
import { TemplateEditor } from "./TemplateEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";
import type { ArchiveWedding } from "./types";

const PAYMENT_STRUCTURES = [
  { value: "deposit + installments", label: "Deposit + installments" },
  { value: "full on signing", label: "Full on signing" },
  { value: "custom", label: "Custom" },
] as const;

type Mode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "generate-intake" }
  | { kind: "generate-draft"; name: string; body: string }
  | { kind: "edit"; template: ContractTemplateRow }
  | { kind: "fill"; template: ContractTemplateRow }
  | {
      kind: "print";
      template: ContractTemplateRow;
      body: string;
      coupleName: string;
      businessName: string;
    };

export function TemplatesSection({
  templates,
  weddings,
  businessName,
}: {
  templates: ContractTemplateRow[];
  weddings: ArchiveWedding[];
  businessName: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Generate intake state
  const [genVendorCategory, setGenVendorCategory] = useState("");
  const [genPaymentStructure, setGenPaymentStructure] = useState<string>(
    PAYMENT_STRUCTURES[0].value,
  );
  const [genCancellationWindow, setGenCancellationWindow] = useState("30 days");
  const [genNotes, setGenNotes] = useState("");

  // Fill form state
  const [projectId, setProjectId] = useState("");
  const [projectVendorId, setProjectVendorId] = useState("");
  const [vendorOptions, setVendorOptions] = useState<FillVendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [mergedBody, setMergedBody] = useState<string | null>(null);
  const [fillMeta, setFillMeta] = useState<{
    coupleName: string;
    businessName: string;
    templateName: string;
  } | null>(null);

  useEffect(() => {
    if (mode.kind !== "fill") return;
    if (!projectId) {
      setVendorOptions([]);
      setProjectVendorId("");
      return;
    }

    let cancelled = false;
    setVendorsLoading(true);
    listProjectVendorsForFill(projectId).then((result) => {
      if (cancelled) return;
      setVendorsLoading(false);
      if (!result.ok) {
        setError(result.error);
        setVendorOptions([]);
        return;
      }
      setVendorOptions(result.vendors);
      setProjectVendorId("");
    });

    return () => {
      cancelled = true;
    };
  }, [mode.kind, projectId]);

  function refresh() {
    router.refresh();
    setMode({ kind: "list" });
  }

  function handleDelete(template: ContractTemplateRow) {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteContractTemplate(template.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function startGenerateIntake() {
    setError(null);
    setGenVendorCategory("");
    setGenPaymentStructure(PAYMENT_STRUCTURES[0].value);
    setGenCancellationWindow("30 days");
    setGenNotes("");
    setMode({ kind: "generate-intake" });
  }

  function handleGenerateDraft() {
    if (!genPaymentStructure.trim()) {
      setError("Choose a payment structure.");
      return;
    }
    if (!genCancellationWindow.trim()) {
      setError("Enter a cancellation window.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await generateContractTemplateDraft({
        vendorCategory: genVendorCategory || undefined,
        paymentStructure: genPaymentStructure,
        cancellationWindow: genCancellationWindow,
        notes: genNotes.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMode({
        kind: "generate-draft",
        name: result.draft.name,
        body: result.draft.body,
      });
    });
  }

  function startFill(template: ContractTemplateRow) {
    setError(null);
    setProjectId("");
    setProjectVendorId("");
    setVendorOptions([]);
    setMergedBody(null);
    setFillMeta(null);
    setMode({ kind: "fill", template });
  }

  function handleFill() {
    if (mode.kind !== "fill") return;
    if (!projectId) {
      setError("Choose a wedding.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await fillContractTemplate(
        mode.template.id,
        projectId,
        projectVendorId || null,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMergedBody(result.merged);
      setFillMeta({
        coupleName: result.coupleName,
        businessName: result.businessName,
        templateName: result.templateName,
      });
    });
  }

  if (mode.kind === "create") {
    return (
      <TemplateEditor onCancel={() => setMode({ kind: "list" })} onSaved={refresh} />
    );
  }

  if (mode.kind === "generate-draft") {
    return (
      <div className="space-y-3">
        <p className="rounded-[var(--radius-inner)] bg-accent-wash px-4 py-2.5 text-[13px] font-medium text-accent shadow-recessed">
          Draft — review before saving
        </p>
        <TemplateEditor
          seed={{ name: mode.name, body: mode.body }}
          onCancel={() => setMode({ kind: "generate-intake" })}
          onSaved={refresh}
        />
      </div>
    );
  }

  if (mode.kind === "generate-intake") {
    return (
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Generate with the assistant
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Answer a few prompts, then review and edit the draft before saving.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-[13px]"
            onClick={() => setMode({ kind: "list" })}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">
              Vendor category
            </span>
            <Select
              value={genVendorCategory}
              onChange={(e) => setGenVendorCategory(e.target.value)}
              disabled={isPending}
              aria-label="Vendor category for draft"
            >
              <option value="">General</option>
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">
              Payment structure
            </span>
            <Select
              value={genPaymentStructure}
              onChange={(e) => setGenPaymentStructure(e.target.value)}
              disabled={isPending}
              aria-label="Payment structure"
            >
              {PAYMENT_STRUCTURES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">
              Cancellation window
            </span>
            <Input
              value={genCancellationWindow}
              onChange={(e) => setGenCancellationWindow(e.target.value)}
              placeholder="30 days"
              disabled={isPending}
              aria-label="Cancellation window"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">
            Tone or extra clauses (optional)
          </span>
          <Textarea
            value={genNotes}
            onChange={(e) => setGenNotes(e.target.value)}
            rows={3}
            disabled={isPending}
            placeholder="Warm but firm; include weather contingency…"
            aria-label="Tone or extra clauses"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleGenerateDraft}
            disabled={isPending}
          >
            {isPending ? "Generating…" : "Generate draft"}
          </Button>
          {error ? (
            <Button
              type="button"
              variant="default"
              onClick={handleGenerateDraft}
              disabled={isPending}
              className="px-3 py-2 text-[13px]"
            >
              Try again
            </Button>
          ) : null}
        </div>

        {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
      </Card>
    );
  }

  if (mode.kind === "edit") {
    return (
      <TemplateEditor
        initial={mode.template}
        onCancel={() => setMode({ kind: "list" })}
        onSaved={refresh}
      />
    );
  }

  if (mode.kind === "print") {
    return (
      <FilledTemplateDocument
        businessName={mode.businessName || businessName}
        templateName={mode.template.name}
        coupleName={mode.coupleName}
        body={mode.body}
        onBack={() => {
          setMergedBody(mode.body);
          setFillMeta({
            coupleName: mode.coupleName,
            businessName: mode.businessName,
            templateName: mode.template.name,
          });
          setMode({ kind: "fill", template: mode.template });
        }}
      />
    );
  }

  if (mode.kind === "fill") {
    return (
      <div className="space-y-4">
        <Card className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                Fill: {mode.template.name}
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Pick a wedding (required) and optionally a vendor for vendor/amount
                tokens.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-[13px]"
              onClick={() => setMode({ kind: "list" })}
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">Wedding</span>
              <Select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setMergedBody(null);
                  setFillMeta(null);
                }}
                disabled={isPending}
                aria-label="Wedding for fill"
              >
                <option value="">Select a wedding…</option>
                {weddings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.archived_at ? " (archived)" : ""}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">
                Vendor (optional)
              </span>
              <Select
                value={projectVendorId}
                onChange={(e) => {
                  setProjectVendorId(e.target.value);
                  setMergedBody(null);
                  setFillMeta(null);
                }}
                disabled={isPending || !projectId || vendorsLoading}
                aria-label="Vendor for fill"
              >
                <option value="">
                  {vendorsLoading
                    ? "Loading…"
                    : !projectId
                      ? "Select a wedding first"
                      : "No vendor (blank vendor tokens)"}
                </option>
                {vendorOptions.map((v) => (
                  <option key={v.projectVendorId} value={v.projectVendorId}>
                    {v.vendorName}
                    {v.category
                      ? ` · ${vendorCategoryLabel(v.category)}`
                      : ""}
                    {v.quotedPrice != null
                      ? ` · $${v.quotedPrice.toLocaleString("en-US")}`
                      : ""}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleFill}
              disabled={isPending || !projectId}
            >
              {isPending ? "Merging…" : "Generate preview"}
            </Button>
          </div>

          {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
        </Card>

        {mergedBody !== null && fillMeta ? (
          <Card className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                  Preview
                </h3>
                <p className="mt-1 text-[13px] text-muted">
                  Edit freely before printing. Changes stay local until you print.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  setMode({
                    kind: "print",
                    template: mode.template,
                    body: mergedBody,
                    coupleName: fillMeta.coupleName,
                    businessName: fillMeta.businessName,
                  })
                }
              >
                Print / Save as PDF
              </Button>
            </div>
            <Textarea
              value={mergedBody}
              onChange={(e) => setMergedBody(e.target.value)}
              rows={18}
              className="min-h-[320px] font-medium leading-relaxed"
              aria-label="Merged contract preview"
            />
          </Card>
        ) : null}
      </div>
    );
  }

  // list
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-muted">
          Reusable agreements you fill for a wedding, then print.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            onClick={startGenerateIntake}
          >
            Generate with the assistant
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setMode({ kind: "create" })}
          >
            New template
          </Button>
        </div>
      </div>

      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

      {templates.length === 0 ? (
        <EmptyState>
          No templates yet. Create one with merge tokens for couple, date, and
          vendor fields.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden p-3 sm:p-4">
          <ul className="list-none">
            {templates.map((template) => (
              <li
                key={template.id}
                className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-ink">
                    {template.name}
                  </p>
                  {template.category ? (
                    <div className="mt-1.5">
                      <Pill variant="default">
                        {vendorCategoryLabel(template.category)}
                      </Pill>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="px-3 py-1.5 text-[13px]"
                    onClick={() => startFill(template)}
                    disabled={isPending}
                  >
                    Use
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="px-3 py-1.5 text-[13px]"
                    onClick={() => setMode({ kind: "edit", template })}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(template)}
                    disabled={isPending}
                    className="px-2 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
