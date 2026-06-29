import { CoupleShellNav } from "@/components/couple/couple-shell-nav";
import { Wordmark } from "@/components/ui/topbar";
import type { ReactNode } from "react";

export function CoupleShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-porcelain">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone bg-porcelain px-6 py-[18px]">
        <Wordmark />
        <CoupleShellNav />
      </header>
      <main className="flex min-h-full flex-1 flex-col">{children}</main>
    </div>
  );
}
