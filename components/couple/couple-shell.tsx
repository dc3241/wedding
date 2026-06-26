import type { ReactNode } from "react";

export function CoupleShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-porcelain">
      <main className="flex min-h-full flex-1 flex-col">{children}</main>
    </div>
  );
}
