"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderLeads } from "@/app/(app)/leads/actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import type { AccountPlan } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { getCopy } from "@/lib/venue-copy";
import { InquiryReplyDrawer } from "./InquiryReplyDrawer";
import { LeadRow } from "./LeadRow";
import {
  buildReorderBatch,
  findLeadContainer,
  groupLeadsByStage,
  moveLeadBetweenStages,
  reorderWithinStage,
  type LeadColumns,
} from "./leads-board-utils";
import {
  LEAD_STAGE_LABEL,
  LEAD_STAGE_VARIANT,
  LEAD_STAGES,
  type Lead,
  type LeadStage,
} from "./types";

function SortableLeadCard({
  lead,
  onStageChange,
  replyDraft,
  onOpenReplyDraft,
}: {
  lead: Lead;
  onStageChange: (id: string, stage: LeadStage) => void;
  replyDraft?: AgentDraftPreview | null;
  onOpenReplyDraft?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("min-w-0", isDragging && "opacity-40")}
    >
      <LeadRow
        lead={lead}
        onStageChange={onStageChange}
        replyDraft={replyDraft}
        onOpenReplyDraft={onOpenReplyDraft}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${lead.couple_name}`}
            className="mt-0.5 flex h-6 w-4 shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded text-muted hover:text-ink active:cursor-grabbing"
          >
            <span className="block h-0.5 w-2.5 rounded-full bg-current" />
            <span className="block h-0.5 w-2.5 rounded-full bg-current" />
            <span className="block h-0.5 w-2.5 rounded-full bg-current" />
          </button>
        }
      />
    </div>
  );
}

function LeadColumn({
  stage,
  leads,
  replyDraftsByLeadId,
  onStageChange,
  onOpenReplyDraft,
}: {
  stage: LeadStage;
  leads: Lead[];
  replyDraftsByLeadId: Record<string, AgentDraftPreview>;
  onStageChange: (id: string, stage: LeadStage) => void;
  onOpenReplyDraft: (leadId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[240px] min-w-0 shrink-0 flex-col rounded-[var(--radius-card)] border border-hairline bg-surface",
        isOver && "border-accent",
      )}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
        <Eyebrow>{LEAD_STAGE_LABEL[stage]}</Eyebrow>
        <Pill variant={LEAD_STAGE_VARIANT[stage]}>{leads.length}</Pill>
      </div>
      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-[120px] min-w-0 flex-1 flex-col gap-2 p-2">
          {leads.map((lead) => (
            <li key={lead.id} className="min-w-0">
              <SortableLeadCard
                lead={lead}
                onStageChange={onStageChange}
                replyDraft={replyDraftsByLeadId[lead.id]}
                onOpenReplyDraft={() => onOpenReplyDraft(lead.id)}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

export function LeadsBoard({
  initialLeads,
  plan = "planner",
  replyDraftsByLeadId = {},
}: {
  initialLeads: Lead[];
  plan?: AccountPlan;
  replyDraftsByLeadId?: Record<string, AgentDraftPreview>;
}) {
  const [columns, setColumns] = useState<LeadColumns>(() =>
    groupLeadsByStage(initialLeads),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewLeadId, setReviewLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const columnsRef = useRef(columns);
  const snapshotRef = useRef<LeadColumns | null>(null);
  const dragSourceStageRef = useRef<LeadStage | null>(null);

  function replaceColumns(next: LeadColumns) {
    columnsRef.current = next;
    setColumns(next);
  }

  useEffect(() => {
    replaceColumns(groupLeadsByStage(initialLeads));
  }, [initialLeads]);

  useEffect(() => {
    if (reviewLeadId && !replyDraftsByLeadId[reviewLeadId]) {
      setReviewLeadId(null);
    }
  }, [reviewLeadId, replyDraftsByLeadId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeLead =
    activeId === null
      ? null
      : LEAD_STAGES.flatMap((stage) => columns[stage]).find(
          (lead) => lead.id === activeId,
        ) ?? null;

  async function persistColumns(
    nextColumns: LeadColumns,
    affectedStages: LeadStage[],
    snapshot: LeadColumns,
  ) {
    const batch = buildReorderBatch(nextColumns, affectedStages);
    if (batch.length === 0) return;

    const snapshotBatch = buildReorderBatch(snapshot, affectedStages);
    const unchanged =
      batch.length === snapshotBatch.length &&
      batch.every(
        (item, index) =>
          item.id === snapshotBatch[index]?.id &&
          item.stage === snapshotBatch[index]?.stage &&
          item.position === snapshotBatch[index]?.position,
      );
    if (unchanged) return;

    const result = await reorderLeads(batch);
    if (!result.ok) {
      replaceColumns(snapshot);
      setError(result.error);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setError(null);
    snapshotRef.current = groupLeadsByStage(
      LEAD_STAGES.flatMap((stage) => columnsRef.current[stage]),
    );
    dragSourceStageRef.current = findLeadContainer(
      String(event.active.id),
      columnsRef.current,
    );
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const current = columnsRef.current;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findLeadContainer(activeId, current);
    const overContainer = findLeadContainer(overId, current);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const overItems = current[overContainer];
    const overIndex = overItems.findIndex((lead) => lead.id === overId);
    const insertIndex = overIndex >= 0 ? overIndex : overItems.length;
    const moved = moveLeadBetweenStages(
      current,
      activeId,
      overContainer,
      insertIndex,
    );

    if (moved) {
      replaceColumns(moved.next);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const snapshot = snapshotRef.current;
    const sourceStage = dragSourceStageRef.current;

    setActiveId(null);
    snapshotRef.current = null;
    dragSourceStageRef.current = null;

    if (!snapshot) return;

    if (!over) {
      replaceColumns(snapshot);
      return;
    }

    const activeLeadId = String(active.id);
    const overLeadId = String(over.id);
    const current = columnsRef.current;
    const activeContainer = findLeadContainer(activeLeadId, current);
    const overContainer = findLeadContainer(overLeadId, current);

    if (!activeContainer || !overContainer) {
      replaceColumns(snapshot);
      return;
    }

    let nextColumns = current;

    if (activeContainer !== overContainer) {
      const overIndex = current[overContainer].findIndex(
        (lead) => lead.id === overLeadId,
      );
      const insertIndex =
        overIndex >= 0 ? overIndex : current[overContainer].length;
      const moved = moveLeadBetweenStages(
        current,
        activeLeadId,
        overContainer,
        insertIndex,
      );

      if (!moved) {
        replaceColumns(snapshot);
        return;
      }

      nextColumns = moved.next;
      replaceColumns(nextColumns);
    } else if (activeLeadId !== overLeadId) {
      const reordered = reorderWithinStage(
        current,
        activeContainer,
        activeLeadId,
        overLeadId,
      );

      if (reordered) {
        nextColumns = reordered;
        replaceColumns(nextColumns);
      }
    }

    const destStage =
      findLeadContainer(activeLeadId, nextColumns) ?? overContainer;
    const affectedStages = [
      ...new Set(
        [sourceStage, destStage].filter(
          (stage): stage is LeadStage => stage !== null,
        ),
      ),
    ];

    await persistColumns(nextColumns, affectedStages, snapshot);
  }

  function handleDragCancel() {
    if (snapshotRef.current) {
      replaceColumns(snapshotRef.current);
    }
    setActiveId(null);
    snapshotRef.current = null;
    dragSourceStageRef.current = null;
  }

  async function handleStageChange(id: string, newStage: LeadStage) {
    const current = columnsRef.current;
    const snapshot = groupLeadsByStage(
      LEAD_STAGES.flatMap((stage) => current[stage]),
    );
    const sourceStage = findLeadContainer(id, current);

    if (!sourceStage || sourceStage === newStage) return;

    setError(null);

    const moved = moveLeadBetweenStages(current, id, newStage);
    if (!moved) return;

    replaceColumns(moved.next);
    await persistColumns(moved.next, [sourceStage, newStage], snapshot);
  }

  if (initialLeads.length === 0) {
    return (
      <p className="px-1 text-[13px] text-muted">
        {getCopy("emptyLeads", plan)}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {LEAD_STAGES.map((stage) => (
              <LeadColumn
                key={stage}
                stage={stage}
                leads={columns[stage]}
                replyDraftsByLeadId={replyDraftsByLeadId}
                onStageChange={handleStageChange}
                onOpenReplyDraft={setReviewLeadId}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="w-[240px] rotate-1 opacity-95">
              <LeadRow
                lead={activeLead}
                replyDraft={replyDraftsByLeadId[activeLead.id]}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <InquiryReplyDrawer
        draft={reviewLeadId ? replyDraftsByLeadId[reviewLeadId] ?? null : null}
        coupleName={
          reviewLeadId
            ? (LEAD_STAGES.flatMap((stage) => columns[stage]).find(
                (lead) => lead.id === reviewLeadId,
              )?.couple_name ?? null)
            : null
        }
        onClose={() => setReviewLeadId(null)}
      />
    </div>
  );
}
