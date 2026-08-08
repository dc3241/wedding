"use client";

import { Button } from "@/components/ui/button";
import type { TourConfig, TourStep } from "@/lib/tours/tour-config";
import { measureTourTarget } from "@/lib/tours/measure-target";
import { cn } from "@/lib/cn";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

const VIEWPORT_MARGIN = 16;
const TOOLTIP_GAP = 14;
const RING_PAD = 8;

type SpotRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TooltipPos = {
  top: number;
  left: number;
  placement: "below" | "above";
};

type TourOverlayProps = {
  config: TourConfig;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

function computeTooltip(
  spot: SpotRect,
  tooltipWidth: number,
  tooltipHeight: number,
): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spotTop = spot.top - RING_PAD;
  const spotBottom = spot.top + spot.height + RING_PAD;
  const spotLeft = spot.left - RING_PAD;

  const fitsBelow = spotBottom + TOOLTIP_GAP + tooltipHeight <= vh - VIEWPORT_MARGIN;
  const fitsAbove = spotTop - TOOLTIP_GAP - tooltipHeight >= VIEWPORT_MARGIN;
  const placement: "below" | "above" =
    fitsBelow || !fitsAbove ? "below" : "above";

  let top =
    placement === "below"
      ? spotBottom + TOOLTIP_GAP
      : spotTop - TOOLTIP_GAP - tooltipHeight;
  top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(top, vh - VIEWPORT_MARGIN - tooltipHeight),
  );

  let left = Math.min(
    Math.max(spotLeft, VIEWPORT_MARGIN),
    vw - tooltipWidth - VIEWPORT_MARGIN,
  );
  left = Math.max(VIEWPORT_MARGIN, left);

  return { top, left, placement };
}

/** Steps whose targets are present in the DOM for this run. */
export function resolvePresentTourSteps(steps: TourStep[]): TourStep[] {
  return steps.filter((s) => measureTourTarget(s.target) != null);
}

export function TourOverlay({
  config,
  stepIndex,
  onNext,
  onBack,
  onSkip,
}: TourOverlayProps) {
  // Provider passes an already-filtered run config; re-check at render in case
  // a target unmounted, and skip forward rather than showing an empty spotlight.
  const step = config.steps[stepIndex];
  const total = config.steps.length;
  const isLast = stepIndex >= total - 1;
  const isFirst = stepIndex <= 0;
  const progressPct = total > 0 ? ((stepIndex + 1) / total) * 100 : 100;

  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [tooltip, setTooltip] = useState<TooltipPos | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 180 });

  const targetMissing = useMemo(() => {
    if (!step) return true;
    return measureTourTarget(step.target) == null;
  }, [step]);

  useLayoutEffect(() => {
    if (!step || targetMissing) {
      onNext();
    }
    // Intentionally only re-run when the step identity changes — not on every
    // onNext identity churn — so a missing target advances once per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [step?.target, stepIndex, targetMissing]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
      if (event.key === "ArrowLeft" && !isFirst) {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, onNext, onBack, isFirst]);

  useLayoutEffect(() => {
    if (!step || targetMissing) return;

    let cancelled = false;
    const target = step.target;

    function update() {
      if (cancelled) return;
      const next = measureTourTarget(target);
      setSpot(next);
      if (next) {
        setTooltip(
          computeTooltip(next, tooltipSize.width, tooltipSize.height),
        );
      } else {
        setTooltip(null);
      }
    }

    const el = document.querySelector(`[data-tour="${target}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    update();
    const raf = window.requestAnimationFrame(update);
    const t = window.setTimeout(update, 320);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, targetMissing, tooltipSize.width, tooltipSize.height]);

  useLayoutEffect(() => {
    const node = document.getElementById("tour-tooltip-card");
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setTooltipSize({ width, height });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [stepIndex]);

  // While skipping a missing target, render nothing (avoid empty scrim flash).
  if (!step || targetMissing || total === 0) return null;

  const ringTop = spot ? spot.top - RING_PAD : 0;
  const ringLeft = spot ? spot.left - RING_PAD : 0;
  const ringW = spot ? spot.width + RING_PAD * 2 : 0;
  const ringH = spot ? spot.height + RING_PAD * 2 : 0;

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-tooltip-title"
    >
      {/* Click-blocker — NoteModal scrim token (ink/25), not the mockup's darker rgba. */}
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={(e) => e.stopPropagation()}
      />

      {spot ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[14px] transition-[top,left,width,height,opacity] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
          style={{
            top: ringTop,
            left: ringLeft,
            width: ringW,
            height: ringH,
            boxShadow: [
              "0 0 0 4px var(--accent-wash)",
              "0 0 0 5px var(--accent)",
              "0 0 0 9999px color-mix(in srgb, var(--ink) 25%, transparent)",
            ].join(", "),
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-ink/25" />
      )}

      <div
        id="tour-tooltip-card"
        className={cn(
          "absolute z-[81] w-[min(100%-2rem,20rem)] rounded-[var(--radius-card)] bg-surface px-[18px] pb-4 pt-[18px] shadow-raised sm:w-80",
          !tooltip && "invisible",
        )}
        style={
          tooltip
            ? { top: tooltip.top, left: tooltip.left }
            : { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN }
        }
      >
        {tooltip ? (
          <span
            aria-hidden
            className="absolute size-3 -translate-x-1/2 rotate-45 bg-surface"
            style={{
              top: tooltip.placement === "below" ? -6 : "auto",
              bottom: tooltip.placement === "above" ? -6 : "auto",
              left: spot
                ? Math.max(
                    16,
                    Math.min(
                      tooltipSize.width - 28,
                      spot.left + spot.width / 2 - tooltip.left,
                    ),
                  )
                : tooltipSize.width / 2,
            }}
          />
        ) : null}

        {/* Progress first — mockup order; recessed well + accent fill */}
        <div
          className="mb-3.5 h-1 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Tour step ${stepIndex + 1} of ${total}`}
        >
          <div
            className="h-full rounded-[var(--radius-pill)] bg-accent transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
          Step {stepIndex + 1} of {total}
        </p>
        <h2
          id="tour-tooltip-title"
          className="mt-1.5 text-[15.5px] font-bold tracking-[-0.01em] text-ink"
        >
          {step.title}
        </h2>
        <p className="mt-1.5 text-[13px] font-medium leading-normal text-muted">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer border-0 bg-transparent px-0.5 py-1.5 text-[12.5px] font-semibold text-muted/80 hover:text-muted"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isFirst}
              className={cn(
                "cursor-pointer rounded-[var(--radius-pill)] border-0 bg-transparent px-2.5 py-2 text-[12.5px] font-bold text-muted hover:bg-well",
                isFirst && "invisible",
              )}
            >
              Back
            </button>
            <Button
              type="button"
              variant="primary"
              onClick={onNext}
              className="px-4 py-2 text-[12.5px]"
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
