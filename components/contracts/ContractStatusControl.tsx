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
  draft: "bg-porcelain text-ink-muted",
  sent: "bg-surface text-clay",
  signed: "bg-surface text-sage",
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
          "flex rounded-full border border-stone bg-surface p-[3px]",
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
                "cursor-pointer rounded-full border-none bg-transparent px-2.5 py-1 text-[12px] font-medium text-ink-muted transition-[color,background] duration-150 disabled:cursor-not-allowed",
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
