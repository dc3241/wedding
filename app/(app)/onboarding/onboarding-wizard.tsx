"use client";

import { useState, useTransition } from "react";
import { saveOnboarding, type OnboardingFields } from "./actions";
import { PlanPreviewStep, StepProgress } from "./plan-preview-step";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  traditions: string;
  priorities: string;
  vibeNotes: string;
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
    traditions: form.traditions,
    priorities: form.priorities,
    vibeNotes: form.vibeNotes,
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
      {hint ? <p className="text-[13px] text-ink-muted">{hint}</p> : null}
      {children}
    </div>
  );
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
    traditions: "",
    priorities: "",
    vibeNotes: "",
  });

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveAndContinue() {
    setSaveError(null);
    startTransition(async () => {
      try {
        await saveOnboarding(projectId, toFields(form));
        setStep(4);
      } catch {
        setSaveError("We couldn't save your preferences. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-14 pb-24">
      <section className="animate-rise px-0 py-2 pb-10 text-center">
        <Eyebrow className="mb-3 block">Welcome</Eyebrow>
        <div className="font-display text-[clamp(40px,6vw,54px)] tracking-[0.005em] text-ink">
          {coupleNames}
        </div>
        <p className="mt-3.5 text-base text-ink-muted">
          Tell us a little about your day — we&apos;ll shape your plan around
          it.
        </p>
      </section>
      <div className="mt-2 h-px bg-stone" aria-hidden />

      <div className="mt-12">
        <StepProgress currentStep={step} />

        <Card className="p-6 sm:p-8">
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] leading-tight text-ink">
                  The basics
                </h2>
                <p className="mt-1.5 text-[15px] text-ink-muted">
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
                <p className="mt-1.5 text-[15px] text-ink-muted">
                  A target helps us prioritize what matters most.
                </p>
              </div>

              <FieldGroup
                label="Total budget"
                htmlFor="total-budget"
                hint="Your overall wedding budget in dollars"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-ink-muted">
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
                <p className="mt-1.5 text-[15px] text-ink-muted">
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
                label="Traditions to honor"
                htmlFor="traditions"
                hint="Cultural, religious, or family customs"
              >
                <Textarea
                  id="traditions"
                  rows={3}
                  placeholder="Jewish hora, Vietnamese tea ceremony..."
                  value={form.traditions}
                  onChange={(event) =>
                    updateField("traditions", event.target.value)
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

              {saveError ? (
                <p className="text-sm text-rosewood">{saveError}</p>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <PlanPreviewStep
              projectId={projectId}
              onBack={() => setStep(3)}
            />
          ) : null}

          {step < 4 ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-stone pt-6">
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

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep((current) => current + 1)}
                >
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
          ) : null}
        </Card>
      </div>
    </div>
  );
}
