"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addDancefloor,
  addSeatingTable,
  assignMemberToLowestFreeSeat,
  assignMemberToSeat,
  deleteSeatingTable,
  moveMemberToSeat,
  moveSeatingTable,
  replaceSeat,
  rotateSeatingTable,
  setSeatingTableKind,
  setSeatingTableSeatCount,
  swapSeats,
  unseatMember,
} from "./actions";
import { GuestRoster } from "./GuestRoster";
import { SeatActionMenu, type SeatMenuTarget } from "./SeatActionMenu";
import { SeatingCanvas } from "./SeatingCanvas";
import { SeatingSelectedPanel } from "./SeatingSelectedPanel";
import { SeatingTableBreakdown } from "./SeatingTableBreakdown";
import { SeatingToolbar } from "./SeatingToolbar";
import {
  DEFAULT_SEAT_COUNT_BY_SHAPE,
  formatPersonName,
  isAssignableRsvpStatus,
  isDancefloor,
  isSeatableTable,
  isSeatingTableKind,
  NUDGE_FINE_STEP,
  NUDGE_STEP,
  type RosterPerson,
  type SeatingAssignment,
  type SeatingSeatableKind,
  type SeatingTable,
  type SeatingTableShape,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SeatingWorkspaceProps = {
  projectId: string;
  tables: SeatingTable[];
  people: RosterPerson[];
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
  people,
  assignments,
}: SeatingWorkspaceProps) {
  const [armedShape, setArmedShape] = useState<SeatingTableShape | null>(null);
  const [armedDancefloor, setArmedDancefloor] = useState(false);
  const [seatCount, setSeatCount] = useState(DEFAULT_SEAT_COUNT_BY_SHAPE.round);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [pendingSeat, setPendingSeat] = useState<{
    tableId: string;
    seatIndex: number;
  } | null>(null);
  const [movingAssignmentId, setMovingAssignmentId] = useState<string | null>(
    null,
  );
  const [seatMenu, setSeatMenu] = useState<SeatMenuTarget | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const breakdownRef = useRef<HTMLElement | null>(null);

  const placing = armedShape !== null || armedDancefloor;

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedIsDancefloor = selectedTable
    ? isDancefloor(selectedTable.kind)
    : false;

  const seatableTables = useMemo(
    () => tables.filter(isSeatableTable),
    [tables],
  );

  const peopleById = useMemo(() => {
    const map = new Map<string, RosterPerson>();
    for (const person of people) {
      map.set(person.id, person);
    }
    return map;
  }, [people]);

  const occupancyByTable = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const assignment of assignments) {
      counts[assignment.table_id] = (counts[assignment.table_id] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  const assignmentsByTable = useMemo(() => {
    const grouped: Record<string, SeatingAssignment[]> = {};
    for (const assignment of assignments) {
      const list = grouped[assignment.table_id] ?? [];
      list.push(assignment);
      grouped[assignment.table_id] = list;
    }
    return grouped;
  }, [assignments]);

  const peopleByTable = useMemo(() => {
    const grouped: Record<
      string,
      Array<RosterPerson & { assignment: SeatingAssignment }>
    > = {};

    for (const assignment of assignments) {
      const person = peopleById.get(assignment.guest_member_id);
      if (!person) continue;
      const list = grouped[assignment.table_id] ?? [];
      list.push({ ...person, assignment });
      grouped[assignment.table_id] = list;
    }

    for (const tableId of Object.keys(grouped)) {
      grouped[tableId].sort((a, b) => {
        const aSeat = a.assignment.seat_index;
        const bSeat = b.assignment.seat_index;
        if (aSeat == null && bSeat != null) return 1;
        if (aSeat != null && bSeat == null) return -1;
        if (aSeat != null && bSeat != null && aSeat !== bSeat) {
          return aSeat - bSeat;
        }
        return formatPersonName(a).localeCompare(formatPersonName(b));
      });
    }

    return grouped;
  }, [assignments, peopleById]);

  const assignmentByMemberId = useMemo(() => {
    const map = new Map<string, SeatingAssignment>();
    for (const assignment of assignments) {
      map.set(assignment.guest_member_id, assignment);
    }
    return map;
  }, [assignments]);

  const assignablePeople = useMemo(
    () =>
      people.filter(
        (person) =>
          !assignmentByMemberId.has(person.id) &&
          isAssignableRsvpStatus(person.rsvp_status),
      ),
    [assignmentByMemberId, people],
  );

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tables) {
      map.set(table.id, table.label);
    }
    return map;
  }, [tables]);

  const clearSeatModes = useCallback(() => {
    setPendingSeat(null);
    setMovingAssignmentId(null);
    setSelectedMemberId(null);
    setSeatMenu(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedTableId || placing) return;

    const id = selectedTableId;
    startTransition(async () => {
      try {
        await deleteSeatingTable(id);
        setSelectedTableId(null);
      } catch {
        // Keep selection if delete fails.
      }
    });
  }, [placing, selectedTableId]);

  const handleRotate = useCallback(
    (direction: "cw" | "ccw") => {
      if (!selectedTableId || placing) return;

      const id = selectedTableId;
      startTransition(async () => {
        await rotateSeatingTable(id, direction);
      });
    },
    [placing, selectedTableId],
  );

  const handleSeatCountChange = useCallback(
    (next: number) => {
      if (!selectedTableId || placing) return;

      const id = selectedTableId;
      setErrorMessage(null);
      startTransition(async () => {
        const result = await setSeatingTableSeatCount(id, next);
        if (!result.ok) {
          setErrorMessage(result.error);
        }
      });
    },
    [placing, selectedTableId],
  );

  const handleKindChange = useCallback(
    (kind: SeatingSeatableKind) => {
      if (!selectedTableId || placing) return;

      const id = selectedTableId;
      setErrorMessage(null);
      startTransition(async () => {
        const result = await setSeatingTableKind(id, kind);
        if (result.ok) {
          setSelectedTableId(null);
          setConfirmation(
            kind === "sweetheart"
              ? "Marked as sweetheart table."
              : kind === "head"
                ? "Marked as head table."
                : "Table kind set to standard.",
          );
        } else {
          setErrorMessage(result.error);
        }
      });
    },
    [placing, selectedTableId],
  );

  const handleMove = useCallback(
    (posX: number, posY: number) => {
      if (!selectedTableId || placing) return;

      const id = selectedTableId;
      startTransition(async () => {
        await moveSeatingTable(id, { posX, posY });
      });
    },
    [placing, selectedTableId],
  );

  const handleTableDragMove = useCallback(
    (id: string, posX: number, posY: number) => {
      startTransition(async () => {
        await moveSeatingTable(id, { posX, posY });
      });
    },
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (armedShape || armedDancefloor) {
          setArmedShape(null);
          setArmedDancefloor(false);
        } else if (
          selectedMemberId ||
          pendingSeat ||
          movingAssignmentId ||
          seatMenu
        ) {
          clearSeatModes();
          setConfirmation(null);
        } else {
          setSelectedTableId(null);
        }
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedTableId &&
        !placing &&
        !selectedMemberId &&
        !pendingSeat &&
        !movingAssignmentId
      ) {
        if (isEditableTarget(event.target)) return;

        event.preventDefault();
        handleDelete();
        return;
      }

      if (
        !selectedTableId ||
        placing ||
        selectedMemberId ||
        pendingSeat ||
        movingAssignmentId ||
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
    armedDancefloor,
    armedShape,
    clearSeatModes,
    handleDelete,
    handleMove,
    movingAssignmentId,
    pendingSeat,
    placing,
    seatMenu,
    selectedMemberId,
    selectedTableId,
    tables,
  ]);

  function toggleShape(shape: SeatingTableShape) {
    setErrorMessage(null);
    setConfirmation(null);
    setArmedDancefloor(false);
    clearSeatModes();

    if (armedShape === shape) {
      setArmedShape(null);
      return;
    }

    setArmedShape(shape);
    setSeatCount(DEFAULT_SEAT_COUNT_BY_SHAPE[shape]);
    setSelectedTableId(null);
  }

  function toggleDancefloor() {
    setErrorMessage(null);
    setConfirmation(null);
    setArmedShape(null);
    clearSeatModes();

    if (armedDancefloor) {
      setArmedDancefloor(false);
      return;
    }

    setArmedDancefloor(true);
    setSelectedTableId(null);
  }

  function handlePlace(posX: number, posY: number) {
    if (armedDancefloor) {
      startTransition(async () => {
        await addDancefloor(projectId, { posX, posY });
      });
      return;
    }

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

  function handleSelectMember(memberId: string) {
    setErrorMessage(null);
    setConfirmation(null);
    setSelectedTableId(null);
    setSeatMenu(null);
    setMovingAssignmentId(null);

    if (pendingSeat) {
      const seat = pendingSeat;
      startTransition(async () => {
        const result = await assignMemberToSeat(
          memberId,
          seat.tableId,
          seat.seatIndex,
        );
        if (result.ok) {
          clearSeatModes();
          setSelectedTableId(null);
          const person = peopleById.get(memberId);
          setConfirmation(
            person
              ? `Seated ${formatPersonName(person)} at seat ${seat.seatIndex}.`
              : `Seated at seat ${seat.seatIndex}.`,
          );
        } else {
          setErrorMessage(result.error);
        }
      });
      return;
    }

    setSelectedMemberId((current) => (current === memberId ? null : memberId));
  }

  function handleUnseat(assignmentId: string) {
    setErrorMessage(null);
    startTransition(async () => {
      await unseatMember(assignmentId);
      clearSeatModes();
      setConfirmation("Person unseated.");
    });
  }

  async function handleBreakdownAdd(
    tableId: string,
    memberId: string,
    seat: number | "auto",
  ): Promise<string | null> {
    setErrorMessage(null);
    const result =
      seat === "auto"
        ? await assignMemberToLowestFreeSeat(memberId, tableId)
        : await assignMemberToSeat(memberId, tableId, seat);
    if (result.ok) {
      const person = peopleById.get(memberId);
      const tableLabel = tableLabelById.get(tableId) ?? "table";
      setConfirmation(
        person
          ? `Added ${formatPersonName(person)} to ${tableLabel}.`
          : `Added to ${tableLabel}.`,
      );
      return null;
    }
    return result.error;
  }

  function handleEmptySeatClick(tableId: string, seatIndex: number) {
    if (placing) return;
    setErrorMessage(null);
    setConfirmation(null);
    setSeatMenu(null);
    setSelectedTableId(null);

    if (movingAssignmentId) {
      const assignmentId = movingAssignmentId;
      startTransition(async () => {
        const result = await moveMemberToSeat(
          assignmentId,
          tableId,
          seatIndex,
        );
        if (result.ok) {
          clearSeatModes();
          setConfirmation(`Moved to seat ${seatIndex}.`);
        } else {
          setErrorMessage(result.error);
        }
      });
      return;
    }

    if (selectedMemberId) {
      const memberId = selectedMemberId;
      startTransition(async () => {
        const result = await assignMemberToSeat(
          memberId,
          tableId,
          seatIndex,
        );
        if (result.ok) {
          clearSeatModes();
          setSelectedTableId(null);
          const person = peopleById.get(memberId);
          setConfirmation(
            person
              ? `Seated ${formatPersonName(person)} at seat ${seatIndex}.`
              : `Seated at seat ${seatIndex}.`,
          );
        } else {
          setErrorMessage(result.error);
        }
      });
      return;
    }

    setPendingSeat((current) =>
      current?.tableId === tableId && current.seatIndex === seatIndex
        ? null
        : { tableId, seatIndex },
    );
    setSelectedMemberId(null);
  }

  function handleOccupiedSeatClick(occupant: {
    assignment: SeatingAssignment;
    person: RosterPerson;
  }) {
    if (placing) return;
    setErrorMessage(null);
    setPendingSeat(null);
    setMovingAssignmentId(null);
    setSelectedMemberId(null);
    setSelectedTableId(null);
    setConfirmation(null);
    setSeatMenu({
      assignmentId: occupant.assignment.id,
      tableId: occupant.assignment.table_id,
      seatIndex: occupant.assignment.seat_index,
      memberId: occupant.person.id,
    });
  }

  function handleNeedsSeatClick(occupant: {
    assignment: SeatingAssignment;
    person: RosterPerson;
  }) {
    if (placing) return;
    setErrorMessage(null);
    setConfirmation(null);
    setPendingSeat(null);
    setSelectedMemberId(null);
    setSelectedTableId(null);
    setSeatMenu({
      assignmentId: occupant.assignment.id,
      tableId: occupant.assignment.table_id,
      seatIndex: null,
      memberId: occupant.person.id,
    });
  }

  function handleTableClick(tableId: string) {
    if (placing) return;
    if (pendingSeat || movingAssignmentId || selectedMemberId || seatMenu) {
      return;
    }

    setSelectedTableId((current) => (current === tableId ? null : tableId));
  }

  function handleEmptyCanvasClick(posX: number, posY: number) {
    if (placing) return;
    if (pendingSeat || movingAssignmentId || selectedMemberId || seatMenu) {
      return;
    }

    if (selectedTableId) {
      handleMove(posX, posY);
    }
  }

  function handleSwapOrReplace(otherMemberId: string) {
    if (!seatMenu) return;

    const otherAssignment = assignmentByMemberId.get(otherMemberId);
    const target = seatMenu;
    const targetPerson = peopleById.get(target.memberId);
    const otherPerson = peopleById.get(otherMemberId);

    setErrorMessage(null);
    startTransition(async () => {
      if (otherAssignment) {
        const result = await swapSeats(target.assignmentId, otherAssignment.id);
        if (result.ok) {
          clearSeatModes();
          setConfirmation(
            `Swapped ${targetPerson ? formatPersonName(targetPerson) : "guest"} with ${otherPerson ? formatPersonName(otherPerson) : "guest"}.`,
          );
        } else {
          setErrorMessage(result.error);
        }
        return;
      }

      const result = await replaceSeat(target.assignmentId, otherMemberId);
      if (result.ok) {
        clearSeatModes();
        setConfirmation(
          `${otherPerson ? formatPersonName(otherPerson) : "Guest"} took the seat; ${targetPerson ? formatPersonName(targetPerson) : "prior guest"} returned to the roster.`,
        );
      } else {
        setErrorMessage(result.error);
      }
    });
  }

  const selectedPerson = selectedMemberId
    ? (peopleById.get(selectedMemberId) ?? null)
    : null;

  const movingAssignment = movingAssignmentId
    ? assignments.find((row) => row.id === movingAssignmentId) ?? null
    : null;
  const movingPerson = movingAssignment
    ? peopleById.get(movingAssignment.guest_member_id) ?? null
    : null;

  const pendingTableLabel = pendingSeat
    ? (tableLabelById.get(pendingSeat.tableId) ?? "table")
    : null;

  const hint = armedDancefloor
    ? "Click the floor plan to place a dance floor. Press Escape to stop placing."
    : armedShape
      ? `Click the floor plan to place a ${armedShape} table. Press Escape to stop placing.`
      : movingPerson
        ? `Click an empty seat to move ${formatPersonName(movingPerson)}. Press Escape to cancel.`
        : pendingSeat
          ? `Seat ${pendingSeat.seatIndex} on ${pendingTableLabel} — pick a person from the roster. Press Escape to cancel.`
          : selectedPerson
            ? `Click an empty seat to place ${formatPersonName(selectedPerson)}. Press Escape to cancel.`
            : selectedTable
              ? `Click an empty spot to move ${selectedTable.label}, or use arrow keys to nudge. Shift+arrow moves in smaller steps.`
              : "Click an empty seat to place someone, or a numbered seat to move / swap / unseat.";

  return (
    <div className={cn("flex flex-col gap-4", isPending && "opacity-90")}>
      {seatableTables.length > 0 ? (
        <div>
          <Button
            type="button"
            variant="default"
            onClick={() => {
              breakdownRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            See Table Breakdown
          </Button>
        </div>
      ) : null}

      <SeatingToolbar
        armedShape={armedShape}
        armedDancefloor={armedDancefloor}
        seatCount={seatCount}
        isPending={isPending}
        onToggleShape={toggleShape}
        onToggleDancefloor={toggleDancefloor}
        onSeatCountChange={setSeatCount}
      >
        <SeatingSelectedPanel
          selectedId={selectedTableId}
          seatCount={selectedTable?.seat_count ?? null}
          occupancy={
            selectedTableId ? (occupancyByTable[selectedTableId] ?? 0) : 0
          }
          kind={
            selectedTable && isSeatingTableKind(selectedTable.kind)
              ? selectedTable.kind
              : null
          }
          isDancefloor={selectedIsDancefloor}
          placing={placing}
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
            people={people}
            assignmentByMemberId={assignmentByMemberId}
            tableLabelById={tableLabelById}
            selectedMemberId={selectedMemberId}
            pendingSeatLabel={
              pendingSeat
                ? `${pendingSeat.seatIndex} · ${pendingTableLabel}`
                : null
            }
            hasTables={seatableTables.length > 0}
            isPending={isPending}
            onSelectMember={handleSelectMember}
            onUnseat={handleUnseat}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {hint ? (
            <p className="text-[13px] font-medium text-muted">{hint}</p>
          ) : null}

          {errorMessage ? (
            <p className="text-[13px] text-rosewood">{errorMessage}</p>
          ) : null}

          {confirmation && !seatMenu ? (
            <p className="text-[13px] font-medium text-sage">{confirmation}</p>
          ) : null}

          {seatMenu ? (
            <SeatActionMenu
              target={seatMenu}
              people={people}
              assignmentByMemberId={assignmentByMemberId}
              isPending={isPending}
              confirmation={confirmation}
              onMove={() => {
                setMovingAssignmentId(seatMenu.assignmentId);
                setSeatMenu(null);
                setConfirmation(null);
                setErrorMessage(null);
              }}
              onSwapOrReplace={handleSwapOrReplace}
              onUnseat={() => handleUnseat(seatMenu.assignmentId)}
              onClose={() => {
                setSeatMenu(null);
                setConfirmation(null);
              }}
            />
          ) : null}

          <SeatingCanvas
            tables={tables}
            armedShape={armedShape}
            armedDancefloor={armedDancefloor}
            selectedId={selectedTableId}
            occupancyByTable={occupancyByTable}
            assignmentsByTable={assignmentsByTable}
            peopleById={peopleById}
            pendingSeat={pendingSeat}
            moveMode={Boolean(movingAssignmentId)}
            assignMode={Boolean(selectedMemberId || pendingSeat)}
            onPlace={handlePlace}
            onTableClick={handleTableClick}
            onEmptyCanvasClick={handleEmptyCanvasClick}
            onTableMove={handleTableDragMove}
            onEmptySeatClick={handleEmptySeatClick}
            onOccupiedSeatClick={handleOccupiedSeatClick}
            onNeedsSeatClick={handleNeedsSeatClick}
          />
        </div>
      </div>

      <SeatingTableBreakdown
        sectionRef={breakdownRef}
        tables={seatableTables}
        peopleByTable={peopleByTable}
        occupancyByTable={occupancyByTable}
        assignablePeople={assignablePeople}
        isPending={isPending}
        onAddMember={handleBreakdownAdd}
        onUnseat={handleUnseat}
      />
    </div>
  );
}
