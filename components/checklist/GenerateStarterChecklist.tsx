"use client";

import { useTransition } from "react";
import { generateStarterChecklist } from "@/app/(app)/projects/[projectId]/checklist/actions";
import { AskAssistantPrompt } from "@/components/assistant/AskAssistantPrompt";
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
        Generate a starter timeline, or ask the assistant to build one tailored
        to your date.
      </p>
      <div className="mx-auto mt-5 flex max-w-md flex-col items-stretch gap-4">
        <div className="flex justify-center">{button}</div>
        <AskAssistantPrompt
          prefill={ASSISTANT_PREFILLS.checklist}
          title="Or ask the assistant to build one"
          description="Phases, due dates, and the tasks you shouldn't miss."
          cta="Build my checklist"
        />
      </div>
    </Card>
  );
}
