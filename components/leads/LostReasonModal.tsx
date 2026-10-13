"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LOST_NOTE_MAX, LOST_REASONS, type LostReason } from "./lead-lost";

export function LostReasonModal({
  coupleName,
  pending,
  onClose,
  onConfirm,
}: {
  coupleName: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: LostReason, note: string) => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const noteId = useId();
  const [reason, setReason] = useState<LostReason | "">("");
  const [note, setNote] = useState("");

  return (
    <Modal onClose={onClose} labelledBy={titleId} panelClassName="max-w-md">
      <h2
        id={titleId}
        className="text-[19px] font-extrabold tracking-[-0.02em] text-ink"
      >
        Why is {coupleName} lost?
      </h2>
      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={reasonId} className="text-sm font-medium text-ink">
            Reason
          </label>
          <Select
            id={reasonId}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value as LostReason | "")}
          >
            <option value="">Choose a reason</option>
            {LOST_REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={noteId} className="text-sm font-medium text-ink">
            Note
          </label>
          <Textarea
            id={noteId}
            rows={3}
            maxLength={LOST_NOTE_MAX}
            value={note}
            disabled={pending}
            placeholder="Optional"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!reason || pending}
          onClick={() => {
            if (reason) onConfirm(reason, note);
          }}
        >
          Mark lost
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={pending}
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
