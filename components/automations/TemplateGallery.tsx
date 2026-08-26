"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
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
              <Select
                value={on ? "on" : "off"}
                disabled={busy}
                aria-label={`${template.name} status`}
                className="!w-auto min-w-[6.5rem] shrink-0 self-start py-1.5 text-[13px]"
                onChange={(event) => {
                  const nextOn = event.target.value === "on";
                  if (nextOn === on) return;
                  handleToggle(template.key, nextOn);
                }}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </Select>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
