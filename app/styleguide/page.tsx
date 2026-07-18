"use client";

import {
  Button,
  Card,
  EmptyState,
  Eyebrow,
  NavLink,
  NavLinks,
  Pill,
  SectionHeader,
  SegmentedToggle,
  SegmentedToggleItem,
  SlimHero,
  StatCard,
  Topbar,
  WeddingHero,
  Wordmark,
} from "@/components/ui";
import { useState } from "react";

const DEMO_DATE = "2026-11-14";

export default function StyleguidePage() {
  const [surface, setSurface] = useState<"couple" | "planner">("couple");

  return (
    <div className="min-h-full bg-canvas text-ink">
      <Topbar>
        <Wordmark />
        <NavLinks style={{ visibility: surface === "couple" ? "visible" : "hidden" }}>
          <NavLink href="#" active>
            Overview
          </NavLink>
          <NavLink href="#">Checklist</NavLink>
          <NavLink href="#">Vendors</NavLink>
          <NavLink href="#">Budget</NavLink>
          <NavLink href="#">Guests</NavLink>
        </NavLinks>
        <SegmentedToggle aria-label="Switch surface">
          <SegmentedToggleItem
            active={surface === "couple"}
            onClick={() => setSurface("couple")}
          >
            Couple
          </SegmentedToggleItem>
          <SegmentedToggleItem
            active={surface === "planner"}
            onClick={() => setSurface("planner")}
          >
            Planner
          </SegmentedToggleItem>
        </SegmentedToggle>
      </Topbar>

      {surface === "couple" ? (
        <main className="mx-auto max-w-[760px] px-6 pb-24 pt-14">
          <section className="mb-12">
            <Eyebrow className="mb-4 block">WeddingHero</Eyebrow>
            <WeddingHero
              coupleNames="Maya & Theo"
              weddingDate={DEMO_DATE}
              dateLabel="Saturday, November 14, 2026 · Sedona, Arizona"
            />
          </section>

          <section className="mb-12">
            <Eyebrow className="mb-4 block">Pills</Eyebrow>
            <div className="flex flex-wrap gap-3">
              <Pill>In progress</Pill>
              <Pill variant="sage">Done</Pill>
              <Pill variant="clay">Due in 9 days</Pill>
              <Pill variant="rosewood">Overdue</Pill>
              <Pill variant="plum">Featured</Pill>
            </div>
          </section>

          <section className="mb-12">
            <Eyebrow className="mb-4 block">Buttons</Eyebrow>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Secondary action</Button>
              <Button variant="primary">Primary action</Button>
            </div>
          </section>

          <section>
            <Eyebrow className="mb-4 block">Card</Eyebrow>
            <Card className="p-6">
              <p className="text-[15px] text-ink">
                Surface card with hairline border, card radius, and raised shadow.
              </p>
            </Card>
          </section>

          <section className="mb-12">
            <Eyebrow className="mb-4 block">EmptyState</Eyebrow>
            <EmptyState>Nothing urgent right now — you&apos;re in good shape.</EmptyState>
          </section>
        </main>
      ) : (
        <main className="mx-auto max-w-[1180px] px-8 pb-20 pt-7">
          <p className="mb-5 text-[13px] text-muted">
            Same tokens, tighter density —{" "}
            <span className="font-medium text-ink">more data per screen</span>,
            the wedding hero shrinks to a slim header.
          </p>

          <section className="mb-8">
            <Eyebrow className="mb-4 block">SlimHero</Eyebrow>
            <SlimHero
              coupleNames="Maya & Theo"
              weddingDate={DEMO_DATE}
              dateLabel="Nov 14, 2026 · Sedona"
            />
          </section>

          <section className="mb-8">
            <Eyebrow className="mb-4 block">Pills</Eyebrow>
            <div className="flex flex-wrap gap-3">
              <Pill>To contact</Pill>
              <Pill variant="clay">Replied</Pill>
              <Pill variant="sage">Booked</Pill>
              <Pill variant="rosewood">Declined</Pill>
            </div>
          </section>

          <section className="mb-8">
            <Eyebrow className="mb-4 block">Stat cards</Eyebrow>
            <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
              <StatCard value={7} label="Tasks due this week" />
              <StatCard value="3 / 8" label="Vendors booked" />
              <StatCard value="58%" label="Budget committed" />
            </div>
          </section>

          <section className="mb-8">
            <SectionHeader>All weddings</SectionHeader>
            <Card className="px-[26px] py-[22px]">
              <div className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">Maya & Theo</div>
              <div className="mt-0.5 text-[13.5px] text-muted">Nov 14, 2026</div>
            </Card>
          </section>

          <section>
            <Eyebrow className="mb-4 block">Buttons</Eyebrow>
            <Button variant="primary">Draft outreach</Button>
          </section>
        </main>
      )}
    </div>
  );
}
