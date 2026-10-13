"use client";

import { contractReviewPrefill } from "@/components/assistant/prefills";
import { useAssistant } from "@/components/assistant/assistant-context";
import { cn } from "@/lib/cn";

export function ReviewContractLink({
  fileName,
  className,
}: {
  fileName: string;
  className?: string;
}) {
  const { openAssistant, eventType } = useAssistant();

  return (
    <button
      type="button"
      aria-label={`Review ${fileName}`}
      onClick={() => openAssistant(contractReviewPrefill(fileName, eventType))}
      className={cn(
        "shrink-0 rounded-[var(--radius-inner)] px-2 py-1 text-[13px] font-semibold text-accent hover:opacity-80",
        className,
      )}
    >
      Review
    </button>
  );
}
