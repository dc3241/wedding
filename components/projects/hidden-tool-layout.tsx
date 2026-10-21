import type { ReactNode } from "react";
import type { HideableTool } from "@/lib/event-type";
import { notFoundIfToolHidden } from "@/lib/project-tools";

export function createHiddenToolLayout(tool: HideableTool) {
  return async function HiddenToolLayout({
    children,
    params,
  }: {
    children: ReactNode;
    params: Promise<{ projectId: string }>;
  }) {
    const { projectId } = await params;
    await notFoundIfToolHidden(projectId, tool);
    return children;
  };
}
