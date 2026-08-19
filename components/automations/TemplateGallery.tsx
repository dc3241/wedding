"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { toggleAutomationTemplate } from "@/lib/automations/actions";
import {
  AUTOMATION_TEMPLATES,
  type AutomationTemplateKey,
} from "@/lib/automations/templates";

export type TemplateInstance = {
  id: string;
  enabled: boolean;
};

export function TemplateGallery({
  instances,
}: {
  instances: Partial<Record<AutomationTemplateKey, TemplateInstance>>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: AutomationTemplateKey, nextOn: boolean) {
    setError(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await toggleAutomationTemplate(key, nextOn);
      setPendingKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
      {AUTOMATION_TEMPLATES.map((template) => {
        const instance = instances[template.key];
        const on = instance?.enabled === true;
        const busy = isPending && pendingKey === template.key;

        return (
          <Card key={template.key} className="p-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                {instance ? (
                  <Link
                    href={`/automations/${instance.id}`}
                    className="text-[19px] font-extrabold tracking-[-0.02em] text-ink no-underline hover:text-accent"
                  >
                    {template.name}
                  </Link>
                ) : (
                  <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                    {template.name}
                  </h3>
                )}
                <p className="mt-1 text-[13px] text-muted">
                  {template.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? "Turn off" : "Turn on"} ${template.name}`}
                disabled={busy}
                onClick={() => handleToggle(template.key, !on)}
                className="shrink-0 self-start rounded-[var(--radius-pill)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <Pill variant={on ? "sage" : "default"}>
                  {on ? "On" : "Off"}
                </Pill>
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
