"use client";

import { useState } from "react";
import { ContractsArchive } from "./ContractsArchive";
import { TemplatesSection } from "./TemplatesSection";
import type { ContractTemplateRow } from "./template-actions";
import type { ArchiveContract, ArchiveWedding } from "./types";
import { cn } from "@/lib/cn";

type Tab = "archive" | "templates";

export function ContractsWorkspace({
  contracts,
  weddings,
  templates,
  businessName,
  initialTab = "archive",
}: {
  contracts: ArchiveContract[];
  weddings: ArchiveWedding[];
  templates: ContractTemplateRow[];
  businessName: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Contracts sections"
        className="inline-flex rounded-[var(--radius-pill)] bg-well p-[3px] shadow-recessed"
      >
        {(
          [
            { id: "archive", label: "All Contracts" },
            { id: "templates", label: "Templates" },
          ] as const
        ).map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "cursor-pointer rounded-[var(--radius-pill)] border-none bg-transparent px-4 py-2 text-[13px] font-semibold text-muted transition-[color,background] duration-150",
                active && "bg-surface text-ink shadow-raised",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "archive" ? (
        <ContractsArchive contracts={contracts} weddings={weddings} />
      ) : (
        <TemplatesSection
          templates={templates}
          weddings={weddings}
          businessName={businessName}
        />
      )}
    </div>
  );
}
