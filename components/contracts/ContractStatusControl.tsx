"use client";

import { useState, useTransition } from "react";
import {
  updateContractStatus,
  type ContractStatus,
} from "@/app/(app)/projects/[projectId]/contracts/actions";
import { cn } from "@/lib/cn";

const OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
];

function normalizeStatus(status: string | null): ContractStatus {
  if (status === "sent" || status === "signed") return status;
  return "draft";
}

const ACTIVE_CLASS: Record<ContractStatus, string> = {
  draft: "bg-well text-muted",
  sent: "bg-clay-wash text-clay",
  signed: "bg-well text-sage",
};

export function ContractStatusControl({
  fileId,
  initialStatus,
}: {
  fileId: string;
  initialStatus: string | null;
}) {
  const [status, setStatus] = useState<ContractStatus>(() =>
    normalizeStatus(initialStatus),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: ContractStatus) {
    if (next === status || isPending) return;

    const previous = status;
    setError(null);
    setStatus(next);

    startTransition(async () => {
      const result = await updateContractStatus(fileId, next);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        role="tablist"
        aria-label="Contract status"
        className={cn(
          "flex rounded-[var(--radius-pill)] bg-well p-[3px] shadow-recessed",
          isPending && "opacity-60",
        )}
      >
        {OPTIONS.map(({ value, label }) => {
          const active = status === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={isPending}
              onClick={() => handleSelect(value)}
              className={cn(
                "cursor-pointer rounded-[var(--radius-pill)] border-none bg-transparent px-2.5 py-1 text-[12px] font-semibold text-muted transition-[color,background] duration-150 disabled:cursor-not-allowed",
                active && ACTIVE_CLASS[value],
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="max-w-[200px] text-right text-[11px] text-rosewood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
