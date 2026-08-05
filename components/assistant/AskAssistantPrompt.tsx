"use client";

import { useAssistant } from "@/components/assistant/assistant-context";
import { AssistantSparkleIcon } from "@/components/assistant/AssistantSparkleIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type AskAssistantPromptProps = {
  prefill: string;
  title: string;
  description?: string;
  cta?: string;
  className?: string;
};

/**
 * Recessed in-page invite to open the assistant with a prefilled ask.
 * Sits inside raised cards / empty states without nesting raised surfaces.
 */
export function AskAssistantPrompt({
  prefill,
  title,
  description,
  cta = "Ask assistant",
  className,
}: AskAssistantPromptProps) {
  const { openAssistant } = useAssistant();

  return (
    <div
      className={cn(
        "rounded-[var(--radius-inner)] bg-well px-4 py-4 text-left shadow-recessed",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-accent-wash text-accent"
          aria-hidden
        >
          <AssistantSparkleIcon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          {description ? (
            <p className="mt-0.5 text-[13px] font-medium text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="primary"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => openAssistant(prefill)}
        >
          {cta}
        </Button>
      </div>
    </div>
  );
}
