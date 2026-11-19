"use client";

import { findVenueMatches, type VenueMatchResult } from "@/app/plan/venue-quiz/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { DirectoryState } from "@/lib/directory/states";
import type { VenueStyle } from "@/lib/directory/venue-style";
import Link from "next/link";
import { useState, useTransition } from "react";

const STYLE_CHOICES: readonly { style: VenueStyle; label: string; hint: string }[] = [
  { style: "Barn", label: "Rustic barn", hint: "Wood beams, string lights, relaxed" },
  { style: "Farm & ranch", label: "Farm or ranch", hint: "Open land, big skies, room to roam" },
  { style: "Estate & mansion", label: "Grand estate", hint: "Formal rooms, sweeping lawns" },
  { style: "Garden", label: "Garden", hint: "Flowers and greenery all around" },
  { style: "Vineyard & winery", label: "Vineyard", hint: "Rows of vines, wine on tap" },
  { style: "Historic", label: "Historic", hint: "A place with a story" },
];

const SIZES = [
  { id: "small", label: "Under 75 guests", tip: "Smaller venues and private rooms open up for you. Ask about minimum spends, which matter more than capacity at your size." },
  { id: "medium", label: "75 to 150 guests", tip: "Most venues fit you. Ask for the seated dinner capacity, not the standing number, and whether a dance floor changes it." },
  { id: "large", label: "Over 150 guests", tip: "Capacity rules you out fast, so ask every venue for its seated capacity with a dance floor before you tour." },
] as const;

type SizeId = (typeof SIZES)[number]["id"];

const selectClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-3 text-[15px] font-medium text-ink";

export function VenueQuiz({ states }: { states: readonly DirectoryState[] }) {
  const [step, setStep] = useState(0);
  const [stateCode, setStateCode] = useState("");
  const [styles, setStyles] = useState<VenueStyle[]>([]);
  const [size, setSize] = useState<SizeId | null>(null);
  const [result, setResult] = useState<VenueMatchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleStyle(s: VenueStyle) {
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function finish(chosen: SizeId) {
    setSize(chosen);
    setFailed(false);
    startTransition(async () => {
      const r = await findVenueMatches(stateCode, styles);
      if (!r) setFailed(true);
      setResult(r);
      setStep(3);
    });
  }

  function restart() {
    setStep(0);
    setStyles([]);
    setSize(null);
    setResult(null);
  }

  const card = "rounded-[var(--radius-card)] bg-surface p-6 shadow-raised md:p-8";

  if (step === 3) {
    const tip = SIZES.find((s) => s.id === size)?.tip;
    if (failed || !result) {
      return (
        <div className={card}>
          <p className="text-[15px] text-ink">We couldn&apos;t load venues just now. Try again in a moment.</p>
          <Button className="mt-4" variant="default" onClick={restart}>
            Start over
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <div className={card}>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Your matches</p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-[-0.02em] text-ink">
            {result.matches.length === 0
              ? `We're still adding venues in ${result.stateName}`
              : result.matchedStyle && styles.length
                ? `${result.matches.length} ${styles.join(" + ").toLowerCase()} venues in ${result.stateName} to start with`
                : `Venues in ${result.stateName} to start with`}
          </h2>
          {!result.matchedStyle && styles.length && result.matches.length ? (
            <p className="mt-2 text-[14.5px] text-muted">
              None of our {result.stateName} venues are tagged with that style yet, so here are a few
              to look at anyway.
            </p>
          ) : null}
          {tip ? (
            <p className="mt-4 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-[14px] leading-relaxed text-ink shadow-recessed">
              <strong>Tip for your size:</strong> {tip}
            </p>
          ) : null}
        </div>

        {result.matches.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.matches.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/wedding-vendors/${result.stateSlug}/${m.slug}`}
                  className="marketing-card-hover block h-full rounded-[var(--radius-card)] bg-surface p-5 no-underline shadow-raised"
                >
                  <span className="block text-[15.5px] font-bold text-ink">{m.name}</span>
                  <span className="block text-[13.5px] text-muted">
                    {m.city ? `${m.city}, ` : ""}
                    {result.stateName}
                  </span>
                  {m.styles.length ? (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {m.styles.map((s) => (
                        <span
                          key={s}
                          className="rounded-[var(--radius-pill)] bg-accent-wash px-2.5 py-0.5 text-[12px] font-semibold text-accent"
                        >
                          {s}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/wedding-vendors/${result.stateSlug}`} variant="primary">
            See all {result.totalInState > 0 ? result.totalInState : ""} venues in {result.stateName}
          </ButtonLink>
          <Button variant="default" onClick={restart}>
            Retake the quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className="text-[13px] font-semibold text-muted">Question {step + 1} of 3</p>

      {step === 0 ? (
        <>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
            Where are you getting married?
          </h2>
          <label className="sr-only" htmlFor="quiz-state">
            State
          </label>
          <select
            id="quiz-state"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className={cn(selectClass, "mt-5")}
          >
            <option value="">Choose a state</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <Button className="mt-5" disabled={!stateCode} onClick={() => setStep(1)}>
            Next
          </Button>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
            Which settings feel like you?
          </h2>
          <p className="mt-1 text-[14px] text-muted">Pick as many as you like, or skip if you&apos;re open.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {STYLE_CHOICES.map((c) => {
              const on = styles.includes(c.style);
              return (
                <button
                  key={c.style}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleStyle(c.style)}
                  className={cn(
                    "rounded-[var(--radius-inner)] border px-4 py-3 text-left transition-colors",
                    on ? "border-accent bg-accent-wash" : "border-hairline bg-surface hover:border-accent",
                  )}
                >
                  <span className="block text-[14.5px] font-bold text-ink">{c.label}</span>
                  <span className="block text-[13px] text-muted">{c.hint}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => setStep(2)}>{styles.length ? "Next" : "Skip, I'm open"}</Button>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
            About how many guests?
          </h2>
          <div className="mt-5 grid gap-2">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() => finish(s.id)}
                className="rounded-[var(--radius-inner)] border border-hairline bg-surface px-4 py-3 text-left text-[14.5px] font-bold text-ink transition-colors hover:border-accent disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
          {pending ? <p className="mt-4 text-[14px] text-muted">Finding venues…</p> : null}
          <Button className="mt-5" variant="ghost" onClick={() => setStep(1)} disabled={pending}>
            Back
          </Button>
        </>
      ) : null}
    </div>
  );
}
