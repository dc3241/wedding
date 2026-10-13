"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import type { AccountPlan } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { getCopy } from "@/lib/venue-copy";
import { InquiryReplyDrawer } from "./InquiryReplyDrawer";
import { LeadRow } from "./LeadRow";
import { LostReasonModal } from "./LostReasonModal";
import type { LostReason } from "./lead-lost";
import {
  LEAD_VIEWS,
  leadMatchesQuery,
  leadMatchesView,
  parseExpandedStages,
  parseLeadView,
  type LeadView,
} from "./lead-views";
import {
  buildReorderBatch,
  findLeadContainer,
  firstOccupiedStage,
  groupLeadsByStage,
  moveLeadBetweenStages,
  reorderWithinStage,
  type LeadColumns,
} from "./leads-board-utils";
import {
  LEAD_STAGE_LABEL,
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
        idPrefix="board"
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${lead.couple_name}`}
            className="mt-0.5 flex h-7 w-4 shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded text-muted hover:text-ink active:cursor-grabbing"
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
  collapsed,
  onExpand,
  onCollapse,
}: {
  stage: LeadStage;
  leads: Lead[];
  replyDraftsByLeadId: Record<string, AgentDraftPreview>;
  onStageChange: (id: string, stage: LeadStage) => void;
  onOpenReplyDraft: (leadId: string) => void;
  collapsed: boolean;
  onExpand: () => void;
  onCollapse: (() => void) | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const label = LEAD_STAGE_LABEL[stage];

  if (collapsed && !isOver) {
    return (
      <section ref={setNodeRef} className="flex w-12 shrink-0">
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={false}
          className="flex w-full flex-col items-center gap-3 rounded-[var(--radius-inner)] bg-well px-1 py-4 shadow-recessed"
        >
          <span className="text-[13px] tabular-nums text-muted">
            {leads.length}
          </span>
          <span className="text-[12px] font-semibold tracking-[0.09em] text-muted uppercase [writing-mode:vertical-rl]">
            {label}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section ref={setNodeRef} className="flex min-w-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline gap-1.5 px-1">
        <Eyebrow>{label}</Eyebrow>
        <span className="text-[13px] tabular-nums text-muted">{leads.length}</span>
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="ml-auto text-[12px] font-medium text-muted hover:text-ink"
          >
            Hide
          </button>
        ) : null}
      </div>
      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className={cn(
            "flex min-h-[120px] min-w-0 flex-1 flex-col gap-2.5 rounded-[var(--radius-inner)] p-1 transition-colors",
            isOver && "bg-well",
          )}
        >
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

type LostPrompt = {
  leadId: string;
  coupleName: string;
  nextColumns: LeadColumns;
  snapshot: LeadColumns;
  affected: LeadStage[];
  applied: boolean;
};

export function LeadsBoard({
  initialLeads,
  plan = "planner",
  replyDraftsByLeadId = {},
  viewKey = null,
  searchQuery = "",
  expandedStages = "",
}: {
  initialLeads: Lead[];
  plan?: AccountPlan;
  replyDraftsByLeadId?: Record<string, AgentDraftPreview>;
  viewKey?: string | null;
  searchQuery?: string;
  expandedStages?: string;
}) {
  const router = useRouter();
  const view = parseLeadView(viewKey);
  const expanded = parseExpandedStages(expandedStages);
  const [columns, setColumns] = useState<LeadColumns>(() =>
    groupLeadsByStage(initialLeads),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewLeadId, setReviewLeadId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<LeadStage>(() =>
    firstOccupiedStage(groupLeadsByStage(initialLeads)),
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchQuery);
  const [lostPrompt, setLostPrompt] = useState<LostPrompt | null>(null);
  const [lostPending, setLostPending] = useState(false);
  const columnsRef = useRef(columns);
  const pushedQuery = useRef(searchQuery);
  const queryTimer = useRef<number | null>(null);
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

  useEffect(() => {
    if (searchQuery === pushedQuery.current) return;
    setQuery(searchQuery);
    pushedQuery.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (queryTimer.current) window.clearTimeout(queryTimer.current);
    };
  }, []);

  function pushUrl(next: {
    view: LeadView | null;
    q: string;
    expand: LeadStage[];
  }) {
    const params = new URLSearchParams();
    if (next.view) params.set("view", next.view);
    const q = next.q.trim();
    if (q) params.set("q", q);
    if (next.expand.length > 0) params.set("expand", next.expand.join(","));
    pushedQuery.current = q;
    const search = params.toString();
    router.replace(search ? `/leads?${search}` : "/leads", { scroll: false });
  }

  function changeQuery(next: string) {
    setQuery(next);
    if (queryTimer.current) window.clearTimeout(queryTimer.current);
    queryTimer.current = window.setTimeout(() => {
      pushUrl({ view, q: next, expand: expanded });
    }, 300);
  }

  const filtered = useMemo(() => {
    const now = new Date();
    const replyIds = new Set(Object.keys(replyDraftsByLeadId));
    const next = {} as LeadColumns;
    for (const stage of LEAD_STAGES) {
      next[stage] = columns[stage].filter(
        (lead) =>
          leadMatchesView(lead, view, replyIds, now) &&
          leadMatchesQuery(lead, query),
      );
    }
    return next;
  }, [columns, view, query, replyDraftsByLeadId]);

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
    lost?: { id: string; reason: LostReason; note: string | null },
  ) {
    const batch = buildReorderBatch(nextColumns, affectedStages).map((item) =>
      lost && item.id === lost.id
        ? { ...item, lostReason: lost.reason, lostNote: lost.note }
        : item,
    );
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

  function requestLost(
    prompt: Omit<LostPrompt, "coupleName"> & { coupleName?: string },
  ) {
    const lead = LEAD_STAGES.flatMap((stage) => prompt.nextColumns[stage]).find(
      (row) => row.id === prompt.leadId,
    );
    setLostPrompt({
      ...prompt,
      coupleName: lead?.couple_name ?? "this lead",
    });
  }

  function cancelLost() {
    if (lostPrompt?.applied) replaceColumns(lostPrompt.snapshot);
    setLostPrompt(null);
  }

  async function confirmLost(reason: LostReason, note: string) {
    if (!lostPrompt) return;
    setLostPending(true);
    setError(null);
    if (!lostPrompt.applied) replaceColumns(lostPrompt.nextColumns);
    const prompt = lostPrompt;
    setLostPrompt(null);
    await persistColumns(prompt.nextColumns, prompt.affected, prompt.snapshot, {
      id: prompt.leadId,
      reason,
      note: note.trim() || null,
    });
    setLostPending(false);
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

    if (destStage === "lost" && sourceStage !== "lost") {
      requestLost({
        leadId: activeLeadId,
        nextColumns,
        snapshot,
        affected: affectedStages,
        applied: true,
      });
      return;
    }

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

    if (newStage === "lost") {
      requestLost({
        leadId: id,
        nextColumns: moved.next,
        snapshot,
        affected: [sourceStage, newStage],
        applied: false,
      });
      return;
    }

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

  const filtering = Boolean(view) || query.trim().length > 0;
  const anyVisible = LEAD_STAGES.some((stage) => filtered[stage].length > 0);
  const mobileLeads = filtered[mobileStage];

  function columnCollapsed(stage: LeadStage) {
    if (lostPrompt && stage === "lost") return false;
    if (stage !== "booked" && stage !== "lost") return false;
    if (expanded.includes(stage)) return false;
    if (filtering && filtered[stage].length > 0) return false;
    return true;
  }

  function setStageExpanded(stage: LeadStage, open: boolean) {
    const next = open
      ? [...expanded.filter((item) => item !== stage), stage]
      : expanded.filter((item) => item !== stage);
    if (queryTimer.current) window.clearTimeout(queryTimer.current);
    pushUrl({ view, q: query, expand: next });
  }

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Lead views"
        >
          {LEAD_VIEWS.map((entry) => {
            const active = view === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (queryTimer.current) window.clearTimeout(queryTimer.current);
                  pushUrl({
                    view: active ? null : entry.key,
                    q: query,
                    expand: expanded,
                  });
                }}
                className={cn(
                  "cursor-pointer rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-semibold",
                  active
                    ? "bg-accent text-surface"
                    : "bg-well text-muted hover:text-ink",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <Input
          type="search"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Search name, email, or venue"
          aria-label="Search leads"
          className="w-full sm:max-w-xs"
        />
      </div>

      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

      {filtering && !anyVisible ? (
        <EmptyState recessed>No leads match.</EmptyState>
      ) : null}

      {filtering && !anyVisible ? null : (
      <div className="lg:hidden">
        <div className="sticky top-20 z-[5] bg-canvas py-2">
          <div
            role="tablist"
            aria-label="Filter by stage"
            className="flex flex-wrap gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
          >
            {LEAD_STAGES.map((stage) => {
              const active = mobileStage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMobileStage(stage)}
                  className={cn(
                    "cursor-pointer rounded-[var(--radius-pill)] border-none px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-accent-wash text-accent"
                      : "bg-transparent text-muted hover:text-ink",
                  )}
                >
                  {LEAD_STAGE_LABEL[stage]}{" "}
                  <span className="tabular-nums">{filtered[stage].length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {mobileLeads.length === 0 ? (
          <EmptyState recessed>None in this stage.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {mobileLeads.map((lead) => (
              <li key={lead.id} className="min-w-0">
                <LeadRow
                  lead={lead}
                  onStageChange={handleStageChange}
                  replyDraft={replyDraftsByLeadId[lead.id]}
                  onOpenReplyDraft={() => setReviewLeadId(lead.id)}
                  showStageMenu
                  idPrefix="mobile"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {filtering && !anyVisible ? null : (
      <div className="hidden min-w-0 max-w-full lg:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex min-w-0 gap-3">
            {LEAD_STAGES.map((stage) => (
              <LeadColumn
                key={stage}
                stage={stage}
                leads={filtered[stage]}
                replyDraftsByLeadId={replyDraftsByLeadId}
                onStageChange={handleStageChange}
                onOpenReplyDraft={setReviewLeadId}
                collapsed={columnCollapsed(stage)}
                onExpand={() => setStageExpanded(stage, true)}
                onCollapse={
                  expanded.includes(stage)
                    ? () => setStageExpanded(stage, false)
                    : null
                }
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <div className="w-[min(100%,14rem)] rotate-1 opacity-95">
                <LeadRow
                  lead={activeLead}
                  replyDraft={replyDraftsByLeadId[activeLead.id]}
                  idPrefix="overlay"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      )}

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

      {lostPrompt ? (
        <LostReasonModal
          coupleName={lostPrompt.coupleName}
          pending={lostPending}
          onClose={cancelLost}
          onConfirm={confirmLost}
        />
      ) : null}
    </div>
  );
}
