"use client";

import { useTransition } from "react";
import { generateStarterChecklist } from "@/app/(app)/projects/[projectId]/checklist/actions";
import { AskAssistantLink } from "@/components/assistant/AskAssistantLink";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GenerateStarterChecklist({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const button = (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => generateStarterChecklist(projectId))}
    >
      {isPending ? "Generating…" : "Generate starter checklist"}
    </Button>
  );

  if (compact) {
    return button;
  }

  return (
    <Card className="px-8 py-12 text-center">
      <p className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        No tasks yet
      </p>
      <p className="mt-2 text-[15px] font-medium text-muted">
        Generate a starter timeline or ask the assistant to build one.
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <div className="flex justify-center">{button}</div>
        <AskAssistantLink prefill={ASSISTANT_PREFILLS.checklist}>
          Ask assistant to build your checklist
        </AskAssistantLink>
      </div>
    </Card>
  );
}
