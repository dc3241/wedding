"use client";

import { SlimHero } from "@/components/ui/slim-hero";
import { shellLayoutClass } from "@/lib/density";
import type { AccountKind } from "@/lib/account-context";
import type { EventType } from "@/lib/event-type";

type ProjectShellProps = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  accountKind: AccountKind;
  eventType?: EventType;
  children: React.ReactNode;
};

export function ProjectShell({
  projectId,
  coupleNames,
  weddingDate,
  accountKind,
  eventType,
  children,
}: ProjectShellProps) {
  const isPlanner = accountKind === "business";

  return (
    <div className={shellLayoutClass(accountKind, isPlanner, "working")}>
      {isPlanner ? (
        <div className="mb-6">
          <SlimHero
            coupleNames={coupleNames}
            weddingDate={weddingDate}
            projectId={projectId}
            eventType={eventType}
          />
        </div>
      ) : null}

      {children}
    </div>
  );
}
