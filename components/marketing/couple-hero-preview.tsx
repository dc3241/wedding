"use client";

import { AnimateWidth } from "@/components/marketing/animate-width";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { useState, type ReactNode } from "react";

/**
 * COUPLES-PIVOT homepage hero preview. Same shell as HeroProductPreview
 * (planner Leads / Vendors / Contracts), with the couple's own tabs.
 * Static illustrative rows — no data wiring.
 */

type Tab = "checklist" | "budget" | "guests";

const TABS: { id: Tab; label: string }[] = [
  { id: "checklist", label: "Checklist" },
  { id: "budget", label: "Budget" },
  { id: "guests", label: "Guests" },
];

const TASKS: { name: string; status: string; variant: PillVariant; meta?: string }[] =
  [
    { name: "Book the venue", status: "Done", variant: "sage", meta: "12 months out" },
    { name: "Send save-the-dates", status: "Done", variant: "sage", meta: "8 months out" },
    { name: "Book hair & makeup trial", status: "Due in 5 days", variant: "clay" },
    { name: "Finalize the seating chart", status: "To do", variant: "default", meta: "2 weeks out" },
  ];

const BUDGET: { name: string; status: string; variant: PillVariant; meta: string }[] =
  [
    { name: "Venue", status: "Paid", variant: "sage", meta: "$12,500 of $12,500" },
    { name: "Photography", status: "Deposit paid", variant: "clay", meta: "$1,800 of $4,200" },
    { name: "Florals", status: "Over by $350", variant: "rosewood", meta: "Estimate $2,400 · actual $2,750" },
  ];

const GUESTS: { name: string; status: string; variant: PillVariant; meta?: string }[] =
  [
    { name: "Maya & Jordan Ellis", status: "Attending", variant: "sage", meta: "2 · Chicken, Vegetarian" },
    { name: "Aunt Rosa", status: "Attending", variant: "sage", meta: "Table 4" },
    { name: "The Okafor family", status: "Awaiting RSVP", variant: "default", meta: "4 guests" },
    { name: "Sam Chen", status: "Declined", variant: "rosewood" },
  ];

function PreviewRow({
  name,
  status,
  variant,
  meta,
}: {
  name: string;
  status: string;
  variant: PillVariant;
  meta?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium text-ink">{name}</p>
        {meta ? (
          <p className="mt-0.5 text-[13px] tabular-nums text-muted">{meta}</p>
        ) : null}
      </div>
      <Pill variant={variant} className="shrink-0">
        {status}
      </Pill>
    </div>
  );
}

function TabPanel({
  id,
  labelledBy,
  children,
}: {
  id: string;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}

function ProgressHeader({
  eyebrow,
  value,
  percent,
  label,
}: {
  eyebrow: string;
  value: string;
  percent: number;
  label: string;
}) {
  return (
    <>
      <div className="mb-3 flex items-end justify-between gap-3">
        <Eyebrow className="mb-1 block">{eyebrow}</Eyebrow>
        <p className="text-[32px] font-extrabold tracking-[-0.02em] tabular-nums text-ink">
          {value}
        </p>
      </div>
      <div
        className="mb-4 h-3 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <AnimateWidth
          widthPercent={percent}
          className="rounded-[var(--radius-pill)] bg-sage"
        />
      </div>
    </>
  );
}

export function CoupleHeroPreview() {
  const [tab, setTab] = useState<Tab>("checklist");

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised md:p-6">
      <div
        role="tablist"
        aria-label="Wedding planning app preview"
        className="mb-5 inline-flex gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            id={`couple-hero-tab-${t.id}`}
            aria-controls={`couple-hero-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "cursor-pointer rounded-[var(--radius-pill)] px-4 py-2 text-[13px] font-semibold transition-[color,background,box-shadow] duration-150",
              tab === t.id
                ? "bg-surface text-ink shadow-raised"
                : "bg-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "checklist" ? (
        <TabPanel
          id="couple-hero-panel-checklist"
          labelledBy="couple-hero-tab-checklist"
        >
          <ProgressHeader
            eyebrow="Checklist"
            value="68%"
            percent={68}
            label="68% of wedding checklist done"
          />
          <div className="space-y-2.5">
            {TASKS.map((row) => (
              <PreviewRow key={row.name} {...row} />
            ))}
          </div>
        </TabPanel>
      ) : null}

      {tab === "budget" ? (
        <TabPanel
          id="couple-hero-panel-budget"
          labelledBy="couple-hero-tab-budget"
        >
          <ProgressHeader
            eyebrow="Paid so far"
            value="$18,400"
            percent={54}
            label="54% of the wedding budget paid"
          />
          <div className="space-y-2.5">
            {BUDGET.map((row) => (
              <PreviewRow key={row.name} {...row} />
            ))}
          </div>
        </TabPanel>
      ) : null}

      {tab === "guests" ? (
        <TabPanel
          id="couple-hero-panel-guests"
          labelledBy="couple-hero-tab-guests"
        >
          <ProgressHeader
            eyebrow="RSVPs in"
            value="112 / 140"
            percent={80}
            label="112 of 140 guests have RSVPed"
          />
          <div className="space-y-2.5">
            {GUESTS.map((row) => (
              <PreviewRow key={row.name} {...row} />
            ))}
          </div>
        </TabPanel>
      ) : null}
    </div>
  );
}
