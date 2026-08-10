"use client";

import { CalendarWorkspace } from "@/app/(app)/calendar/CalendarWorkspace";
import type {
  ActiveWedding,
  CalendarEventRow,
  PaymentDueOverlay,
  TaskDueOverlay,
} from "@/app/(app)/calendar/types";
import {
  createProjectCalendarEvent,
  deleteProjectCalendarEvent,
  updateProjectCalendarEvent,
} from "./actions";

export function ProjectCalendarWorkspace({
  projectId,
  year,
  month,
  events,
  wedding,
  payments,
  tasks,
}: {
  projectId: string;
  year: number;
  month: number;
  events: CalendarEventRow[];
  wedding: ActiveWedding;
  payments: PaymentDueOverlay[];
  tasks: TaskDueOverlay[];
}) {
  return (
    <CalendarWorkspace
      year={year}
      month={month}
      events={events}
      weddings={[wedding]}
      payments={payments}
      tasks={tasks}
      basePath={`/projects/${projectId}/calendar`}
      lockedProjectId={projectId}
      weddingOverlayLabel="Wedding day"
      hideProjectName
      railWidth="fixed"
      mutations={{
        create: (input) => createProjectCalendarEvent(projectId, input),
        update: (id, fields) =>
          updateProjectCalendarEvent(projectId, id, fields),
        delete: (id) => deleteProjectCalendarEvent(projectId, id),
      }}
    />
  );
}
