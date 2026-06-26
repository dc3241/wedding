"use client";

import { SlimHero } from "@/components/ui/slim-hero";
import { shellLayoutClass } from "@/lib/density";
import type { AccountKind } from "@/lib/account-context";
import { cn } from "@/lib/cn";

type ProjectShellProps = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  accountKind: AccountKind;
  children: React.ReactNode;
};

export function ProjectShell({
  coupleNames,
  weddingDate,
  accountKind,
  children,
}: ProjectShellProps) {
  const isPlanner = accountKind === "business";

  return (
    <div className={shellLayoutClass(accountKind, isPlanner)}>
      {isPlanner ? (
        <div className="mb-6">
          <SlimHero coupleNames={coupleNames} weddingDate={weddingDate} />
        </div>
      ) : null}

      {children}
    </div>
  );
}
