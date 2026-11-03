"use client";

import { useState, useTransition } from "react";
import { createSeatingRule, removeSeatingRule } from "./rules-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Select } from "@/components/ui/select";

export type SeatingRuleRow = {
  id: string;
  kind: "together" | "apart";
  aName: string;
  bName: string;
};

export type RulePerson = { id: string; label: string };

export function SeatingRulesCard({
  projectId,
  rules,
  people,
}: {
  projectId: string;
  rules: SeatingRuleRow[];
  people: RulePerson[];
}) {
  const [kind, setKind] = useState<"together" | "apart">("apart");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!a || !b) {
      setError("Pick two people.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await createSeatingRule(projectId, kind, a, b);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setA("");
      setB("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      setError(null);
      const result = await removeSeatingRule(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card className="px-6 py-5">
      <Eyebrow>Seating rules</Eyebrow>
      <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Who sits together, who doesn&apos;t
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Households already sit together. Add rules for everyone else, then ask
        the assistant to seat your guests.
      </p>

      {rules.length === 0 ? (
        <p className="mt-3 text-[14px] text-muted">No rules yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-3 py-2 shadow-recessed"
            >
              <span className="min-w-0 text-[14px] text-ink">
                <span className="font-medium">{rule.aName}</span>{" "}
                <span className={rule.kind === "apart" ? "text-rosewood" : "text-sage"}>
                  {rule.kind === "apart" ? "keep apart from" : "sit with"}
                </span>{" "}
                <span className="font-medium">{rule.bName}</span>
              </span>
              <Button
                type="button"
                variant="default"
                disabled={isPending}
                onClick={() => remove(rule.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <Select value={a} onChange={(e) => setA(e.target.value)} disabled={isPending} aria-label="First person">
          <option value="">First person</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as "together" | "apart")}
          disabled={isPending}
          aria-label="Rule type"
        >
          <option value="apart">keep apart from</option>
          <option value="together">sit with</option>
        </Select>
        <Select value={b} onChange={(e) => setB(e.target.value)} disabled={isPending} aria-label="Second person">
          <option value="">Second person</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="primary" disabled={isPending} onClick={add}>
          Add rule
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
