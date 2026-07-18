"use client";

import { useAssistant } from "@/components/assistant/assistant-context";
import { cn } from "@/lib/cn";

export function AskAssistantLink({
  children,
  prefill,
  className,
}: {
  children: React.ReactNode;
  prefill: string;
  className?: string;
}) {
  const { openAssistant } = useAssistant();

  return (
    <button
      type="button"
      onClick={() => openAssistant(prefill)}
      className={cn(
        "text-[13px] font-medium text-accent underline-offset-2 hover:opacity-90 hover:underline",
        className,
      )}
    >
      {children}
    </button>
  );
}
