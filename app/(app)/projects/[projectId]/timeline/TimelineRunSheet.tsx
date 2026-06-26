"use client";

import { ChecklistTimeline } from "@/components/checklist/ChecklistTimeline";
import { TimelineEventRow } from "./TimelineEventRow";
import {
  groupTimelineEvents,
  type TimelineEvent,
  type TimelineRunSheetBlock,
} from "./types";
import { useAccountKind } from "@/components/account-density-provider";
import { phaseSectionClass } from "@/lib/density";
import { cn } from "@/lib/cn";

function SectionBlock({
  block,
  isLast,
}: {
  block: TimelineRunSheetBlock;
  isLast: boolean;
}) {
  const accountKind = useAccountKind();
  const isPlanner = accountKind === "business";

  return (
    <li className={phaseSectionClass(accountKind, isLast)}>
      <span
        className="absolute top-1.5 -left-px size-2.5 -translate-x-1/2 rounded-full border border-stone bg-porcelain"
        aria-hidden
      />

      {block.section ? (
        <h2
          className={cn(
            "font-medium text-ink",
            isPlanner ? "text-sm" : "text-base",
          )}
        >
          {block.section}
        </h2>
      ) : null}

      <ul className={cn(block.section ? (isPlanner ? "mt-2" : "mt-3") : undefined)}>
        {block.events.map((event) => (
          <TimelineEventRow key={event.id} event={event} />
        ))}
      </ul>
    </li>
  );
}

export function TimelineRunSheet({ events }: { events: TimelineEvent[] }) {
  const blocks = groupTimelineEvents(events);

  return (
    <ChecklistTimeline>
      {blocks.map((block, index) => (
        <SectionBlock
          key={`${block.section ?? "ungrouped"}-${block.events[0]?.id ?? index}`}
          block={block}
          isLast={index === blocks.length - 1}
        />
      ))}
    </ChecklistTimeline>
  );
}
