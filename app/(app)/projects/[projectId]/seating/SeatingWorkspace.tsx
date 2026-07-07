"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  addSeatingTable,
  deleteSeatingTable,
  moveSeatingTable,
} from "./actions";
import { SeatingCanvas } from "./SeatingCanvas";
import { SeatingPalette } from "./SeatingPalette";
import {
  DEFAULT_SEAT_COUNT_BY_SHAPE,
  NUDGE_FINE_STEP,
  NUDGE_STEP,
  type SeatingTable,
  type SeatingTableShape,
} from "./types";
import { cn } from "@/lib/cn";

type SeatingWorkspaceProps = {
  projectId: string;
  tables: SeatingTable[];
};

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function SeatingWorkspace({ projectId, tables }: SeatingWorkspaceProps) {
  const [armedShape, setArmedShape] = useState<SeatingTableShape | null>(null);
  const [seatCount, setSeatCount] = useState(DEFAULT_SEAT_COUNT_BY_SHAPE.round);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTable = tables.find((table) => table.id === selectedId) ?? null;

  const handleDelete = useCallback(() => {
    if (!selectedId || armedShape) return;

    const id = selectedId;
    startTransition(async () => {
      try {
        await deleteSeatingTable(id);
        setSelectedId(null);
      } catch {
        // Keep selection if delete fails.
      }
    });
  }, [armedShape, selectedId]);

  const handleMove = useCallback(
    (posX: number, posY: number) => {
      if (!selectedId || armedShape) return;

      const id = selectedId;
      startTransition(async () => {
        await moveSeatingTable(id, { posX, posY });
      });
    },
    [armedShape, selectedId],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (armedShape) {
          setArmedShape(null);
        } else {
          setSelectedId(null);
        }
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedId &&
        !armedShape
      ) {
        if (isEditableTarget(event.target)) return;

        event.preventDefault();
        handleDelete();
        return;
      }

      if (!selectedId || armedShape || isEditableTarget(event.target)) return;

      const step = event.shiftKey ? NUDGE_FINE_STEP : NUDGE_STEP;
      const table = tables.find((row) => row.id === selectedId);
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
  }, [armedShape, handleDelete, handleMove, selectedId, tables]);

  function toggleShape(shape: SeatingTableShape) {
    if (armedShape === shape) {
      setArmedShape(null);
      return;
    }

    setArmedShape(shape);
    setSeatCount(DEFAULT_SEAT_COUNT_BY_SHAPE[shape]);
    setSelectedId(null);
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

  function handleSelectTable(id: string) {
    if (armedShape) return;

    if (selectedId === id) {
      setSelectedId(null);
      return;
    }

    setSelectedId(id);
  }

  function handleEmptyCanvasClick(posX: number, posY: number) {
    if (armedShape) return;

    if (selectedId) {
      handleMove(posX, posY);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start",
        isPending && "opacity-90",
      )}
    >
      <SeatingPalette
        armedShape={armedShape}
        seatCount={seatCount}
        selectedId={selectedId}
        isPending={isPending}
        onToggleShape={toggleShape}
        onSeatCountChange={setSeatCount}
        onDelete={handleDelete}
      />

      <div className="min-w-0 flex-1">
        {armedShape ? (
          <p className="mb-2 text-[13px] text-ink-muted">
            Click the floor plan to place a {armedShape} table. Press Escape to stop placing.
          </p>
        ) : selectedTable ? (
          <p className="mb-2 text-[13px] text-ink-muted">
            Click an empty spot to move {selectedTable.label}, or use arrow keys to nudge.
            Shift+arrow moves in smaller steps.
          </p>
        ) : null}

        <SeatingCanvas
          tables={tables}
          armedShape={armedShape}
          selectedId={selectedId}
          onPlace={handlePlace}
          onSelectTable={handleSelectTable}
          onEmptyCanvasClick={handleEmptyCanvasClick}
        />
      </div>
    </div>
  );
}
