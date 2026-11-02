"use client";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { AssistantProvider } from "@/components/assistant/assistant-context";
import type { AgentDraftPreview, AssistantMessage } from "@/components/assistant/types";
import type { AccountKind } from "@/lib/account-context";
import type { AssistantAccessSummary } from "@/lib/billing/assistant-budget";
import type { EventType } from "@/lib/event-type";
import type { ReactNode } from "react";

export function AssistantWorkspace({
  children,
  projectId,
  accountKind,
  eventType,
  initialMessages,
  pendingDrafts,
  initialAccess = null,
}: {
  children: ReactNode;
  projectId: string;
  accountKind: AccountKind;
  eventType: EventType;
  initialMessages: AssistantMessage[];
  pendingDrafts: AgentDraftPreview[];
  initialAccess?: AssistantAccessSummary | null;
}) {
  return (
    <AssistantProvider eventType={eventType}>
      {children}
      <AssistantPanel
        projectId={projectId}
        accountKind={accountKind}
        eventType={eventType}
        initialMessages={initialMessages}
        pendingDrafts={pendingDrafts}
        initialAccess={initialAccess}
      />
    </AssistantProvider>
  );
}
