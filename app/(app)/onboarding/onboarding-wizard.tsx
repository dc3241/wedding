"use client";

import { useState, useTransition } from "react";
import { saveOnboarding, type OnboardingFields } from "./actions";
import { PlanPreviewStep, StepProgress } from "./plan-preview-step";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import {
  FORMALITY_OPTIONS,
  type Formality,
} from "@/lib/wedding-formality";

type OnboardingWizardProps = {
  projectId: string;
  coupleNames: string;
};

type FormState = {
  weddingDate: string;
  location: string;
  guestEstimate: string;
  totalBudget: string;
  style: string;
  priorities: string;
  vibeNotes: string;
  includeBudget: boolean;
  includeChecklist: boolean;
  includeVendors: boolean;
  formality: Formality | "";
  priorityVendorCategoryIds: string[];
  alreadyBookedVendorCategoryIds: string[];
};

const FORMALITY_LABELS: Record<Formality, string> = {
  casual: "Casual",
  "semi-formal": "Semi-formal",
  formal: "Formal",
  "black-tie": "Black-tie",
};

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

function parseOptionalBudget(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

function toFields(form: FormState): OnboardingFields {
  return {
    weddingDate: form.weddingDate.trim() || null,
    location: form.location,
    guestEstimate: parseOptionalInt(form.guestEstimate),
    totalBudget: parseOptionalBudget(form.totalBudget),
    style: form.style,
    priorities: form.priorities,
    vibeNotes: form.vibeNotes,
    includeBudget: form.includeBudget,
    includeChecklist: form.includeChecklist,
    includeVendors: form.includeVendors,
    formality: form.formality || null,
    priorityVendorCategoryIds: form.priorityVendorCategoryIds,
    alreadyBookedVendorCategoryIds: form.alreadyBookedVendorCategoryIds,
  };
}

function FieldGroup({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

function toggleIdInList(ids: string[], categoryId: string): string[] {
  return ids.includes(categoryId)
    ? ids.filter((id) => id !== categoryId)
    : [...ids, categoryId];
}

export function OnboardingWizard({
  projectId,
  coupleNames,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    weddingDate: "",
    location: "",
    guestEstimate: "",
    totalBudget: "",
    style: "",
    priorities: "",
    vibeNotes: "",
    includeBudget: true,
    includeChecklist: true,
    includeVendors: true,
    formality: "",
    priorityVendorCategoryIds: [],
    alreadyBookedVendorCategoryIds: [],
  });

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePriorityVendorCategory(categoryId: string) {
    setForm((prev) => ({
      ...prev,
      priorityVendorCategoryIds: toggleIdInList(
        prev.priorityVendorCategoryIds,
        categoryId,
      ),
    }));
  }

  function toggleAlreadyBookedVendorCategory(categoryId: string) {
    setForm((prev) => ({
      ...prev,
      alreadyBookedVendorCategoryIds: toggleIdInList(
        prev.alreadyBookedVendorCategoryIds,
        categoryId,
      ),
    }));
  }

  function handleContinue() {
    setStep((current) => current + 1);
  }

  function handleSaveAndContinue() {
    setSaveError(null);
    startTransition(async () => {
      try {
        await saveOnboarding(projectId, toFields(form));
        setStep(6);
      } catch {
        setSaveError("We couldn't save your preferences. Please try again.");
      }
    });
  }

  const advance = step < 5 ? handleContinue : handleSaveAndContinue;

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-14 pb-24">
      <section className="animate-rise px-0 py-2 pb-10 text-center">
        <Eyebrow className="mb-3 block">Welcome</Eyebrow>
        <div className="font-display text-[clamp(40px,6vw,54px)] tracking-[0.005em] text-ink">
          {coupleNames}
        </div>
        <p className="mt-3.5 text-base text-muted">
          Tell us a little about your day — we&apos;ll shape your plan around
          it.
        </p>
      </section>
      <div className="mt-2 h-px bg-hairline" aria-hidden />

      <div className="mt-12">
        <StepProgress currentStep={step} />

        <Card className="p-6 sm:p-8">
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] leading-tight text-ink">
                  The basics
                </h2>
                <p className="mt-1.5 text-[15px] text-muted">
                  When and where are you celebrating?
                </p>
              </div>

              <FieldGroup label="Wedding date" htmlFor="wedding-date">
                <Input
                  id="wedding-date"
                  type="date"
                  value={form.weddingDate}
                  onChange={(event) =>
                    updateField("weddingDate", event.target.value)
                  }
                />
              </FieldGroup>

              <FieldGroup
                label="Location"
                htmlFor="location"
                hint="City, region, or venue area"
              >
                <Input
                  id="location"
                  type="text"
                  placeholder="Napa Valley, CA"
                  value={form.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                />
              </FieldGroup>

              <FieldGroup
                label="Estimated guest count"
                htmlFor="guest-estimate"
              >
                <Input
                  id="guest-estimate"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="120"
                  value={form.guestEstimate}
                  onChange={(event) =>
                    updateField("guestEstimate", event.target.value)
                  }
                />
              </FieldGroup>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] leading-tight text-ink">
                  Your budget
                </h2>
                <p className="mt-1.5 text-[15px] text-muted">
                  A target helps us prioritize what matters most.
                </p>
              </div>

              <FieldGroup
                label="Total budget"
                htmlFor="total-budget"
                hint="Your overall wedding budget in dollars"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-muted">
                    $
                  </span>
                  <Input
                    id="total-budget"
                    type="text"
                    inputMode="decimal"
                    placeholder="35,000"
                    className="pl-7 tabular-nums"
                    value={form.totalBudget}
                    onChange={(event) =>
                      updateField("totalBudget", event.target.value)
                    }
                  />
                </div>
              </FieldGroup>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] leading-tight text-ink">
                  Your style
                </h2>
                <p className="mt-1.5 text-[15px] text-muted">
                  Help us understand the feeling you&apos;re going for.
                </p>
              </div>

              <FieldGroup
                label="Style & vibe"
                htmlFor="style"
                hint='e.g. "modern garden, intimate, candlelit"'
              >
                <Input
                  id="style"
                  type="text"
                  placeholder="Modern garden party with a relaxed feel"
                  value={form.style}
                  onChange={(event) =>
                    updateField("style", event.target.value)
                  }
                />
              </FieldGroup>

              <FieldGroup
                label="Top priorities"
                htmlFor="priorities"
                hint="What matters most to you?"
              >
                <Textarea
                  id="priorities"
                  rows={3}
                  placeholder="Great food, live band, lots of dancing..."
                  value={form.priorities}
                  onChange={(event) =>
                    updateField("priorities", event.target.value)
                  }
                />
              </FieldGroup>

              <FieldGroup
                label="Anything else"
                htmlFor="vibe-notes"
                hint="Optional — anything else you'd like your plan to reflect"
              >
                <Textarea
                  id="vibe-notes"
                  rows={3}
                  placeholder="We're both introverts — keep the ceremony short and sweet."
                  value={form.vibeNotes}
                  onChange={(event) =>
                    updateField("vibeNotes", event.target.value)
                  }
                />
              </FieldGroup>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">
                  What should we suggest?
                </legend>
                <p className="text-[13px] text-muted">
                  We&apos;ll draft only the parts you want — you can always add
                  more later.
                </p>
                <div className="space-y-2.5">
                  {(
                    [
                      {
                        key: "includeChecklist" as const,
                        id: "include-checklist",
                        label: "Checklist",
                      },
                      {
                        key: "includeBudget" as const,
                        id: "include-budget",
                        label: "Budget",
                      },
                      {
                        key: "includeVendors" as const,
                        id: "include-vendors",
                        label: "Vendor recommendations",
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.id}
                      htmlFor={option.id}
                      className="flex cursor-pointer items-center gap-2.5 text-[15px] font-medium text-ink"
                    >
                      <input
                        id={option.id}
                        type="checkbox"
                        checked={form[option.key]}
                        onChange={(event) =>
                          updateField(option.key, event.target.checked)
                        }
                        className="size-4 shrink-0 rounded border-ring accent-accent"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] leading-tight text-ink">
                  Your focus
                </h2>
                <p className="mt-1.5 text-[15px] text-muted">
                  Optional — helps us weight the plan toward what you care
                  about most.
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">
                  Formality
                </legend>
                <p className="text-[13px] text-muted">
                  How dressed-up should the day feel?
                </p>
                <div className="space-y-2.5">
                  {FORMALITY_OPTIONS.map((option) => (
                    <label
                      key={option}
                      htmlFor={`formality-${option}`}
                      className="flex cursor-pointer items-center gap-2.5 text-[15px] font-medium text-ink"
                    >
                      <input
                        id={`formality-${option}`}
                        type="radio"
                        name="formality"
                        checked={form.formality === option}
                        onChange={() => updateField("formality", option)}
                        className="size-4 shrink-0 accent-accent"
                      />
                      {FORMALITY_LABELS[option]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">
                  Priority vendors
                </legend>
                <p className="text-[13px] text-muted">
                  We&apos;ll put more budget and checklist attention on these
                  categories.
                </p>
                <div className="space-y-2.5">
                  {VENDOR_CATEGORIES.map((category) => (
                    <label
                      key={category.id}
                      htmlFor={`priority-vendor-${category.id}`}
                      className="flex cursor-pointer items-center gap-2.5 text-[15px] font-medium text-ink"
                    >
                      <input
                        id={`priority-vendor-${category.id}`}
                        type="checkbox"
                        checked={form.priorityVendorCategoryIds.includes(
                          category.id,
                        )}
                        onChange={() =>
                          togglePriorityVendorCategory(category.id)
                        }
                        className="size-4 shrink-0 rounded border-ring accent-accent"
                      />
                      {category.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] leading-tight text-ink">
                  Already booked
                </h2>
                <p className="mt-1.5 text-[15px] text-muted">
                  Optional — we&apos;ll skip finding those vendors, but still
                  plan budget for them.
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">
                  Vendors you already have
                </legend>
                <p className="text-[13px] text-muted">
                  Select any categories you&apos;ve already booked.
                </p>
                <div className="space-y-2.5">
                  {VENDOR_CATEGORIES.map((category) => (
                    <label
                      key={category.id}
                      htmlFor={`already-booked-${category.id}`}
                      className="flex cursor-pointer items-center gap-2.5 text-[15px] font-medium text-ink"
                    >
                      <input
                        id={`already-booked-${category.id}`}
                        type="checkbox"
                        checked={form.alreadyBookedVendorCategoryIds.includes(
                          category.id,
                        )}
                        onChange={() =>
                          toggleAlreadyBookedVendorCategory(category.id)
                        }
                        className="size-4 shrink-0 rounded border-ring accent-accent"
                      />
                      {category.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {saveError ? (
                <p className="text-sm text-rosewood">{saveError}</p>
              ) : null}
            </div>
          ) : null}

          {step === 6 ? (
            <PlanPreviewStep
              projectId={projectId}
              includeBudget={form.includeBudget}
              includeChecklist={form.includeChecklist}
              includeVendors={form.includeVendors}
              alreadyBookedVendorCategoryIds={
                form.alreadyBookedVendorCategoryIds
              }
              onBack={() => setStep(5)}
            />
          ) : null}

          {step < 6 ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-hairline pt-6">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setStep((current) => current - 1)}
                  disabled={isPending}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={advance}
                  disabled={isPending}
                >
                  Decide Later
                </Button>
                {step < 5 ? (
                  <Button type="button" onClick={handleContinue}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSaveAndContinue}
                    disabled={isPending}
                  >
                    {isPending ? "Saving…" : "Create my wedding plan"}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
