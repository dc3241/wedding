import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";

export function DirectoryShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
