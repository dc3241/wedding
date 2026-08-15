"use client";

import { AnimateWidth } from "@/components/marketing/animate-width";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { useState, type ReactNode } from "react";

type Tab = "leads" | "vendors" | "contracts";

const TABS: { id: Tab; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "vendors", label: "Vendors" },
  { id: "contracts", label: "Contracts" },
];

const LEADS: { name: string; status: string; variant: PillVariant; meta?: string }[] =
  [
    { name: "Sarah & Malik", status: "New", variant: "default" },
    { name: "The Whitmans", status: "Proposal", variant: "clay" },
    {
      name: "Grace & Theo",
      status: "Stale (16d no activity)",
      variant: "rosewood",
    },
    { name: "Devon & Priya", status: "Booked", variant: "sage", meta: "$34,000" },
  ];

const VENDORS: { name: string; status: string; variant: PillVariant }[] = [
  { name: "Bloom & Bramble, Florist", status: "Booked", variant: "sage" },
  { name: "Highline Catering", status: "Replied 1d ago", variant: "clay" },
  { name: "Aperture Studio, Photo", status: "To contact", variant: "default" },
];

const CONTRACTS: { name: string; status: string; variant: PillVariant }[] = [
  { name: "Devon & Priya", status: "Signed", variant: "sage" },
  { name: "The Whitmans", status: "Sent", variant: "clay" },
  { name: "Grace & Theo", status: "Draft", variant: "default" },
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

export function HeroProductPreview() {
  const [tab, setTab] = useState<Tab>("leads");

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised md:p-6">
      <div
        role="tablist"
        aria-label="Product preview"
        className="mb-5 inline-flex gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            id={`hero-tab-${t.id}`}
            aria-controls={`hero-panel-${t.id}`}
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

      {tab === "leads" ? (
        <TabPanel id="hero-panel-leads" labelledBy="hero-tab-leads">
          <div className="space-y-2.5">
            {LEADS.map((lead) => (
              <PreviewRow key={lead.name} {...lead} />
            ))}
          </div>
        </TabPanel>
      ) : null}

      {tab === "vendors" ? (
        <TabPanel id="hero-panel-vendors" labelledBy="hero-tab-vendors">
          <div className="space-y-2.5">
            {VENDORS.map((vendor) => (
              <PreviewRow key={vendor.name} {...vendor} />
            ))}
          </div>
        </TabPanel>
      ) : null}

      {tab === "contracts" ? (
        <TabPanel id="hero-panel-contracts" labelledBy="hero-tab-contracts">
          <div className="mb-4 flex items-end justify-between gap-3">
            <Eyebrow className="mb-1 block">This month</Eyebrow>
            <p className="text-[40px] font-extrabold tracking-[-0.02em] tabular-nums text-ink">
              75%
            </p>
          </div>
          <div
            className="mb-4 h-3 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
            role="progressbar"
            aria-valuenow={75}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="75% of contracts signed this month"
          >
            <AnimateWidth
              widthPercent={75}
              className="rounded-[var(--radius-pill)] bg-sage"
            />
          </div>
          <div className="space-y-2.5">
            {CONTRACTS.map((row) => (
              <PreviewRow key={row.name} {...row} />
            ))}
          </div>
        </TabPanel>
      ) : null}
    </div>
  );
}
