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
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
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
}: {
  lead: Lead;
  onStageChange: (id: string, stage: LeadStage) => void;
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
      className={cn(isDragging && "opacity-40")}
    >
      <div className="relative">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${lead.couple_name}`}
          className="absolute left-2 top-3 z-10 flex h-6 w-4 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded text-ink-muted hover:text-ink active:cursor-grabbing"
        >
          <span className="block h-0.5 w-2.5 rounded-full bg-current" />
          <span className="block h-0.5 w-2.5 rounded-full bg-current" />
          <span className="block h-0.5 w-2.5 rounded-full bg-current" />
        </button>
        <div className="pl-6">
          <LeadRow lead={lead} onStageChange={onStageChange} />
        </div>
      </div>
    </div>
  );
}

function LeadColumn({
  stage,
  leads,
  onStageChange,
}: {
  stage: LeadStage;
  leads: Lead[];
  onStageChange: (id: string, stage: LeadStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[240px] shrink-0 flex-col rounded-lg border border-stone bg-surface",
        isOver && "border-plum",
      )}
    >
      <div className="flex items-center gap-2 border-b border-stone px-3 py-2.5">
        <Eyebrow>{LEAD_STAGE_LABEL[stage]}</Eyebrow>
        <Pill variant={LEAD_STAGE_VARIANT[stage]}>{leads.length}</Pill>
      </div>
      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <SortableLeadCard lead={lead} onStageChange={onStageChange} />
            </li>
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

export function LeadsBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [columns, setColumns] = useState<LeadColumns>(() =>
    groupLeadsByStage(initialLeads),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<LeadColumns | null>(null);
  const dragSourceStageRef = useRef<LeadStage | null>(null);

  useEffect(() => {
    setColumns(groupLeadsByStage(initialLeads));
  }, [initialLeads]);

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

    const result = await reorderLeads(batch);
    if (!result.ok) {
      setColumns(snapshot);
      setError(result.error);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setError(null);
    snapshotRef.current = groupLeadsByStage(
      LEAD_STAGES.flatMap((stage) => columns[stage]),
    );
    dragSourceStageRef.current = findLeadContainer(String(event.active.id), columns);
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findLeadContainer(String(active.id), columns);
    const overContainer = findLeadContainer(String(over.id), columns);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setColumns((prev) => {
      const overItems = prev[overContainer];
      const overIndex = overItems.findIndex((lead) => lead.id === over.id);
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;

      const moved = moveLeadBetweenStages(
        prev,
        String(active.id),
        overContainer,
        insertIndex,
      );

      return moved?.next ?? prev;
    });
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
      setColumns(snapshot);
      return;
    }

    const activeLeadId = String(active.id);
    const overLeadId = String(over.id);
    const activeContainer = findLeadContainer(activeLeadId, snapshot);
    const overContainer = LEAD_STAGES.includes(overLeadId as LeadStage)
      ? (overLeadId as LeadStage)
      : findLeadContainer(overLeadId, snapshot);

    if (!activeContainer || !overContainer) {
      setColumns(snapshot);
      return;
    }

    let nextColumns: LeadColumns;

    if (activeContainer === overContainer) {
      const reordered = reorderWithinStage(
        snapshot,
        activeContainer,
        activeLeadId,
        overLeadId,
      );

      if (!reordered) {
        setColumns(snapshot);
        return;
      }

      nextColumns = reordered;
      setColumns(nextColumns);
      await persistColumns(nextColumns, [activeContainer], snapshot);
      return;
    }

    const overIndex = snapshot[overContainer].findIndex(
      (lead) => lead.id === overLeadId,
    );
    const insertIndex = overIndex >= 0 ? overIndex : snapshot[overContainer].length;
    const moved = moveLeadBetweenStages(
      snapshot,
      activeLeadId,
      overContainer,
      insertIndex,
    );

    if (!moved) {
      setColumns(snapshot);
      return;
    }

    nextColumns = moved.next;
    setColumns(nextColumns);

    const affectedStages = [
      ...new Set(
        [sourceStage, overContainer].filter(
          (stage): stage is LeadStage => stage !== null,
        ),
      ),
    ];

    await persistColumns(nextColumns, affectedStages, snapshot);
  }

  function handleDragCancel() {
    if (snapshotRef.current) {
      setColumns(snapshotRef.current);
    }
    setActiveId(null);
    snapshotRef.current = null;
    dragSourceStageRef.current = null;
  }

  async function handleStageChange(id: string, newStage: LeadStage) {
    const snapshot = groupLeadsByStage(
      LEAD_STAGES.flatMap((stage) => columns[stage]),
    );
    const sourceStage = findLeadContainer(id, columns);

    if (!sourceStage || sourceStage === newStage) return;

    setError(null);

    const moved = moveLeadBetweenStages(columns, id, newStage);
    if (!moved) return;

    setColumns(moved.next);
    await persistColumns(moved.next, [sourceStage, newStage], snapshot);
  }

  if (initialLeads.length === 0) {
    return (
      <p className="px-1 text-[13px] text-ink-muted">
        No leads yet. Add a prospective couple to start tracking your pipeline.
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
                onStageChange={handleStageChange}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="w-[240px] rotate-1 opacity-95">
              <LeadRow lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
