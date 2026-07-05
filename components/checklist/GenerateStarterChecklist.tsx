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
    <Card className="px-4 py-6 text-center">
      <p className="text-sm text-ink-muted">
        No tasks yet. Generate a starter timeline or add tasks below.
      </p>
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="flex justify-center">{button}</div>
        <AskAssistantLink prefill={ASSISTANT_PREFILLS.checklist}>
          Ask assistant to build your checklist
        </AskAssistantLink>
      </div>
    </Card>
  );
}
