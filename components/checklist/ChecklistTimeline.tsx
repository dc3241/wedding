import type { ReactNode } from "react";

export function ChecklistTimeline({ children }: { children: ReactNode }) {
  return (
    <ol className="relative ml-1 border-l border-stone">{children}</ol>
  );
}
