import {
  LEAD_STAGES,
  type Lead,
  type LeadStage,
} from "./types";

export type LeadColumns = Record<LeadStage, Lead[]>;

export function groupLeadsByStage(leads: Lead[]): LeadColumns {
  const groups = Object.fromEntries(
    LEAD_STAGES.map((stage) => [stage, [] as Lead[]]),
  ) as LeadColumns;

  for (const lead of leads) {
    groups[lead.stage].push(lead);
  }

  for (const stage of LEAD_STAGES) {
    groups[stage].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.created_at.localeCompare(b.created_at);
    });
  }

  return groups;
}

export function findLeadContainer(
  id: string,
  columns: LeadColumns,
): LeadStage | null {
  if (LEAD_STAGES.includes(id as LeadStage)) {
    return id as LeadStage;
  }

  for (const stage of LEAD_STAGES) {
    if (columns[stage].some((lead) => lead.id === id)) {
      return stage;
    }
  }

  return null;
}

export type ReorderLeadItem = {
  id: string;
  stage: LeadStage;
  position: number;
};

export function buildReorderBatch(
  columns: LeadColumns,
  stages: LeadStage[],
): ReorderLeadItem[] {
  const items: ReorderLeadItem[] = [];

  for (const stage of stages) {
    columns[stage].forEach((lead, index) => {
      items.push({ id: lead.id, stage, position: index });
    });
  }

  return items;
}

export function moveLeadBetweenStages(
  columns: LeadColumns,
  leadId: string,
  targetStage: LeadStage,
  targetIndex?: number,
): { next: LeadColumns; sourceStage: LeadStage } | null {
  const sourceStage = findLeadContainer(leadId, columns);
  if (!sourceStage) return null;

  const next = Object.fromEntries(
    LEAD_STAGES.map((stage) => [stage, [...columns[stage]]]),
  ) as LeadColumns;

  const sourceItems = next[sourceStage];
  const activeIndex = sourceItems.findIndex((lead) => lead.id === leadId);
  if (activeIndex < 0) return null;

  const [moved] = sourceItems.splice(activeIndex, 1);
  const updatedLead = { ...moved, stage: targetStage };
  const targetItems = next[targetStage];
  const insertIndex =
    targetIndex === undefined
      ? targetItems.length
      : Math.max(0, Math.min(targetIndex, targetItems.length));

  targetItems.splice(insertIndex, 0, updatedLead);

  return { next, sourceStage };
}

export function reorderWithinStage(
  columns: LeadColumns,
  stage: LeadStage,
  activeId: string,
  overId: string,
): LeadColumns | null {
  const items = columns[stage];
  const activeIndex = items.findIndex((lead) => lead.id === activeId);
  const overIndex = items.findIndex((lead) => lead.id === overId);

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return null;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(activeIndex, 1);
  nextItems.splice(overIndex, 0, moved);

  return { ...columns, [stage]: nextItems };
}
