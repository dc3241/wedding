"use client";

import { useState } from "react";
import {
  ExternalRegistryEditor,
  type ExternalLinkRow,
} from "./ExternalRegistryEditor";
import { AddRegistryItemPanel } from "./RegistryItemForm";
import { RegistryItemCard } from "./RegistryItemCard";
import type { RegistryClaim, RegistryItem } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";

export function RegistryBoard({
  projectId,
  eyebrow,
  items,
  claimsByItem,
  externalLinks,
}: {
  projectId: string;
  eyebrow: string;
  items: RegistryItem[];
  claimsByItem: Record<string, RegistryClaim[]>;
  externalLinks: ExternalLinkRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const count = items.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={eyebrow}
        title="Registry"
        description="Gifts you’d love — managed here, shared on your wedding site."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => setAddOpen((open) => !open)}
          >
            {addOpen ? "Close" : "+ Add item"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Pill variant="accent">
          {count === 1 ? "1 item" : `${count} items`}
        </Pill>
      </div>

      <AddRegistryItemPanel
        projectId={projectId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-5">
          {count === 0 && !addOpen ? (
            <Card variant="emotional" className="px-8 py-14 text-center">
              <p className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                Add your first gift
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[15px] font-medium text-muted">
                Build a list of things you’d love. Guests see them when your
                wedding site is published.
              </p>
              <div className="mt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setAddOpen(true)}
                >
                  + Add item
                </Button>
              </div>
            </Card>
          ) : count === 0 ? (
            <p className="text-[15px] font-medium text-muted">
              Fill in the form to add your first gift.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item.id}>
                  <RegistryItemCard
                    projectId={projectId}
                    item={item}
                    claims={claimsByItem[item.id] ?? []}
                  />
                </li>
              ))}
            </ul>
          )}

          <ExternalRegistryEditor
            projectId={projectId}
            initialLinks={externalLinks}
          />
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
              Your list
            </p>
            <p className="mt-2 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              {count === 0
                ? "No gifts yet"
                : count === 1
                  ? "1 gift on your registry"
                  : `${count} gifts on your registry`}
            </p>
            <p className="mt-2 text-[13px] text-muted">
              Prices are for display only and don’t affect your budget. Publish
              your wedding site to share the registry.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
