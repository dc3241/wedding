"use client";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { AssistantProvider } from "@/components/assistant/assistant-context";
import type { AssistantMessage } from "@/components/assistant/types";
import type { AccountKind } from "@/lib/account-context";
import type { ReactNode } from "react";

export function AssistantWorkspace({
  children,
  projectId,
  accountKind,
  initialMessages,
}: {
  children: ReactNode;
  projectId: string;
  accountKind: AccountKind;
  initialMessages: AssistantMessage[];
}) {
  return (
    <AssistantProvider>
      {children}
      <AssistantPanel
        projectId={projectId}
        accountKind={accountKind}
        initialMessages={initialMessages}
      />
    </AssistantProvider>
  );
}
