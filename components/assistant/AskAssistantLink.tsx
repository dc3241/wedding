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
        "text-[13px] font-medium text-plum underline-offset-2 hover:text-plum-deep hover:underline",
        className,
      )}
    >
      {children}
    </button>
  );
}
