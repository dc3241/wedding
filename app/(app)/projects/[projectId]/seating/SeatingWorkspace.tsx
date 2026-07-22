"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  addSeatingTable,
  assignGuestToTable,
  deleteSeatingTable,
  moveSeatingTable,
  rotateSeatingTable,
  setSeatingTableKind,
  setSeatingTableSeatCount,
  unassignGuest,
} from "./actions";
import { GuestRoster } from "./GuestRoster";
import { SeatingCanvas } from "./SeatingCanvas";
import { SeatingSelectedPanel } from "./SeatingSelectedPanel";
import { SeatingTableBreakdown } from "./SeatingTableBreakdown";
import { SeatingToolbar } from "./SeatingToolbar";
import {
  DEFAULT_SEAT_COUNT_BY_SHAPE,
  NUDGE_FINE_STEP,
  NUDGE_STEP,
  type RosterGuest,
  type SeatingAssignment,
  type SeatingTableKind,
  type SeatingTable,
  type SeatingTableShape,
} from "./types";
import { cn } from "@/lib/cn";

type SeatingWorkspaceProps = {
  projectId: string;
  tables: SeatingTable[];
  guests: RosterGuest[];
  assignments: SeatingAssignment[];
};

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function SeatingWorkspace({
  projectId,
  tables,
  guests,
  assignments,
}: SeatingWorkspaceProps) {
  const [armedShape, setArmedShape] = useState<SeatingTableShape | null>(null);
  const [seatCount, setSeatCount] = useState(DEFAULT_SEAT_COUNT_BY_SHAPE.round);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ?? null;

  const occupancyByTable = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const assignment of assignments) {
      counts[assignment.table_id] = (counts[assignment.table_id] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  const guestsByTable = useMemo(() => {
    const byId = new Map<string, RosterGuest>();
    for (const guest of guests) {
      byId.set(guest.id, guest);
    }

    const grouped: Record<string, RosterGuest[]> = {};
    for (const assignment of assignments) {
      const guest = byId.get(assignment.guest_id);
      if (!guest) continue;
      const list = grouped[assignment.table_id] ?? [];
      list.push(guest);
      grouped[assignment.table_id] = list;
    }

    for (const tableId of Object.keys(grouped)) {
      grouped[tableId].sort((a, b) => {
        const aName = a.full_name?.trim() ?? "";
        const bName = b.full_name?.trim() ?? "";
        if (!aName && bName) return 1;
        if (aName && !bName) return -1;
        const byName = aName.localeCompare(bName);
        if (byName !== 0) return byName;
        return a.id.localeCompare(b.id);
      });
    }

    return grouped;
  }, [assignments, guests]);

  const assignmentByGuestId = useMemo(() => {
    const map = new Map<string, SeatingAssignment>();
    for (const assignment of assignments) {
      map.set(assignment.guest_id, assignment);
    }
    return map;
  }, [assignments]);

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tables) {
      map.set(table.id, table.label);
    }
    return map;
  }, [tables]);

  const handleDelete = useCallback(() => {
    if (!selectedTableId || armedShape) return;

    const id = selectedTableId;
    startTransition(async () => {
      try {
        await deleteSeatingTable(id);
        setSelectedTableId(null);
      } catch {
        // Keep selection if delete fails.
      }
    });
  }, [armedShape, selectedTableId]);

  const handleKindChange = useCallback(
    (kind: SeatingTableKind) => {
      if (!selectedTableId || armedShape) return;

      const id = selectedTableId;
      startTransition(async () => {
        await setSeatingTableKind(id, kind);
      });
    },
    [armedShape, selectedTableId],
  );

  const handleRotate = useCallback(
    (direction: "cw" | "ccw") => {
      if (!selectedTableId || armedShape) return;

      const id = selectedTableId;
      startTransition(async () => {
        await rotateSeatingTable(id, direction);
      });
    },
    [armedShape, selectedTableId],
  );

  const handleSeatCountChange = useCallback(
    (next: number) => {
      if (!selectedTableId || armedShape) return;

      const id = selectedTableId;
      setErrorMessage(null);
      startTransition(async () => {
        const result = await setSeatingTableSeatCount(id, next);
        if (!result.ok) {
          setErrorMessage(result.error);
        }
      });
    },
    [armedShape, selectedTableId],
  );

  const handleMove = useCallback(
    (posX: number, posY: number) => {
      if (!selectedTableId || armedShape) return;

      const id = selectedTableId;
      startTransition(async () => {
        await moveSeatingTable(id, { posX, posY });
      });
    },
    [armedShape, selectedTableId],
  );

  const handleTableDragMove = useCallback((id: string, posX: number, posY: number) => {
    startTransition(async () => {
      await moveSeatingTable(id, { posX, posY });
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (armedShape) {
          setArmedShape(null);
        } else if (selectedGuestId) {
          setSelectedGuestId(null);
        } else {
          setSelectedTableId(null);
        }
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedTableId &&
        !armedShape &&
        !selectedGuestId
      ) {
        if (isEditableTarget(event.target)) return;

        event.preventDefault();
        handleDelete();
        return;
      }

      if (
        !selectedTableId ||
        armedShape ||
        selectedGuestId ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const step = event.shiftKey ? NUDGE_FINE_STEP : NUDGE_STEP;
      const table = tables.find((row) => row.id === selectedTableId);
      if (!table) return;

      let posX = table.pos_x;
      let posY = table.pos_y;
      let moved = false;

      switch (event.key) {
        case "ArrowUp":
          posY -= step;
          moved = true;
          break;
        case "ArrowDown":
          posY += step;
          moved = true;
          break;
        case "ArrowLeft":
          posX -= step;
          moved = true;
          break;
        case "ArrowRight":
          posX += step;
          moved = true;
          break;
      }

      if (!moved) return;

      event.preventDefault();
      handleMove(posX, posY);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    armedShape,
    handleDelete,
    handleMove,
    selectedGuestId,
    selectedTableId,
    tables,
  ]);

  function toggleShape(shape: SeatingTableShape) {
    setErrorMessage(null);
    if (armedShape === shape) {
      setArmedShape(null);
      return;
    }

    setArmedShape(shape);
    setSeatCount(DEFAULT_SEAT_COUNT_BY_SHAPE[shape]);
    setSelectedTableId(null);
    setSelectedGuestId(null);
  }

  function handlePlace(posX: number, posY: number) {
    if (!armedShape) return;

    const shape = armedShape;
    const seats = seatCount;

    startTransition(async () => {
      await addSeatingTable(projectId, {
        shape,
        seatCount: seats,
        posX,
        posY,
      });
    });
  }

  function handleSelectGuest(guestId: string) {
    setErrorMessage(null);
    setSelectedTableId(null);
    setSelectedGuestId((current) => (current === guestId ? null : guestId));
  }

  function handleUnassign(assignmentId: string) {
    setErrorMessage(null);
    startTransition(async () => {
      await unassignGuest(assignmentId);
    });
  }

  function handleTableClick(tableId: string) {
    if (armedShape) return;

    // Assign mode: a guest is selected -> seat them at the clicked table.
    if (selectedGuestId) {
      const guestId = selectedGuestId;
      setErrorMessage(null);
      startTransition(async () => {
        const result = await assignGuestToTable(projectId, {
          guestId,
          tableId,
        });
        if (result.ok) {
          setSelectedGuestId(null);
        } else {
          setErrorMessage(result.error);
        }
      });
      return;
    }

    // Selection mode: toggle table selection for move/delete.
    setSelectedTableId((current) => (current === tableId ? null : tableId));
  }

  function handleEmptyCanvasClick(posX: number, posY: number) {
    if (armedShape) return;
    if (selectedGuestId) return; // assign mode: empty clicks are a no-op

    if (selectedTableId) {
      handleMove(posX, posY);
    }
  }

  const selectedGuest = selectedGuestId
    ? guests.find((guest) => guest.id === selectedGuestId) ?? null
    : null;

  const hint = armedShape
    ? `Click the floor plan to place a ${armedShape} table. Press Escape to stop placing.`
    : selectedGuest
      ? "Click a table to seat the selected guest. Press Escape to cancel."
      : selectedTable
        ? `Click an empty spot to move ${selectedTable.label}, or use arrow keys to nudge. Shift+arrow moves in smaller steps.`
        : null;

  return (
    <div className={cn("flex flex-col gap-4", isPending && "opacity-90")}>
      <SeatingToolbar
        armedShape={armedShape}
        seatCount={seatCount}
        isPending={isPending}
        onToggleShape={toggleShape}
        onSeatCountChange={setSeatCount}
      >
        <SeatingSelectedPanel
          selectedId={selectedTableId}
          selectedKind={selectedTable?.kind ?? null}
          seatCount={selectedTable?.seat_count ?? null}
          occupancy={
            selectedTableId ? (occupancyByTable[selectedTableId] ?? 0) : 0
          }
          armedShape={armedShape}
          isPending={isPending}
          onKindChange={handleKindChange}
          onSeatCountChange={handleSeatCountChange}
          onRotate={handleRotate}
          onDelete={handleDelete}
        />
      </SeatingToolbar>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="w-full lg:w-[300px] lg:shrink-0">
          <GuestRoster
            projectId={projectId}
            guests={guests}
            assignmentByGuestId={assignmentByGuestId}
            tableLabelById={tableLabelById}
            selectedGuestId={selectedGuestId}
            hasTables={tables.length > 0}
            isPending={isPending}
            onSelectGuest={handleSelectGuest}
            onUnassign={handleUnassign}
          />
        </div>

        <div className="min-w-0 flex-1">
          {hint ? (
            <p className="mb-2 text-[13px] font-medium text-muted">{hint}</p>
          ) : null}

          {errorMessage ? (
            <p className="mb-2 text-[13px] text-rosewood">{errorMessage}</p>
          ) : null}

          <SeatingCanvas
            tables={tables}
            armedShape={armedShape}
            selectedId={selectedTableId}
            occupancyByTable={occupancyByTable}
            assignMode={Boolean(selectedGuestId)}
            onPlace={handlePlace}
            onTableClick={handleTableClick}
            onEmptyCanvasClick={handleEmptyCanvasClick}
            onTableMove={handleTableDragMove}
          />
        </div>
      </div>

      <SeatingTableBreakdown
        tables={tables}
        guestsByTable={guestsByTable}
        occupancyByTable={occupancyByTable}
      />
    </div>
  );
}
