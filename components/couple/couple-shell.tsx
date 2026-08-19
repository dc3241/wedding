import { AccountBrandMark } from "@/components/branding/account-brand-mark";
import { CoupleShellNav } from "@/components/couple/couple-shell-nav";
import { Wordmark } from "@/components/ui/topbar";
import { brandAccentStyle } from "@/lib/branding/accent-style";
import type { ProjectBranding } from "@/lib/branding/types";
import type { ReactNode } from "react";

export function CoupleShell({
  children,
  branding = null,
}: {
  children: ReactNode;
  branding?: ProjectBranding | null;
}) {
  const style = brandAccentStyle(branding);

  return (
    <div className="flex min-h-full flex-col bg-canvas" style={style}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas px-6 py-[18px]">
        {branding ? <AccountBrandMark branding={branding} /> : <Wordmark />}
        <CoupleShellNav />
      </header>
      <main className="flex min-h-full flex-1 flex-col">{children}</main>
    </div>
  );
}
