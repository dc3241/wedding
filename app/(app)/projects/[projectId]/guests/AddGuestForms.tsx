"use client";

import { useState, useTransition } from "react";
import { addGuest, bulkAddGuests } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AddGuestForms({ projectId }: { projectId: string }) {
  const [isAddPending, startAddTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();
  const [partySize, setPartySize] = useState(1);

  const additionalSlots = Math.max(0, partySize - 1);

  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = (form.get("name") as string) ?? "";
    const household = (form.get("household") as string) ?? "";
    const email = (form.get("email") as string) ?? "";
    const size = Number(form.get("party_size") ?? 1);
    const additionalNames: string[] = [];
    for (let i = 0; i < Math.max(0, size - 1); i++) {
      additionalNames.push((form.get(`additional_name_${i}`) as string) ?? "");
    }

    if (!name.trim()) return;

    startAddTransition(async () => {
      await addGuest(
        projectId,
        name,
        household,
        email,
        size,
        additionalNames,
      );
      formEl.reset();
      setPartySize(1);
    });
  }

  function handleBulkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const text = (form.get("names") as string) ?? "";

    if (!text.trim()) return;

    startBulkTransition(async () => {
      await bulkAddGuests(projectId, text);
      formEl.reset();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="px-6 py-5">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <Eyebrow>Add guest</Eyebrow>
            <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              One at a time
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="guest-name"
                className="text-[14px] font-medium text-ink"
              >
                Full name
              </label>
              <Input
                id="guest-name"
                name="name"
                type="text"
                required
                placeholder="Full name"
                disabled={isAddPending}
              />
            </div>
            {Array.from({ length: additionalSlots }, (_, index) => (
              <div key={index} className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor={`guest-additional-name-${index}`}
                  className="text-[14px] font-medium text-ink"
                >
                  Name
                </label>
                <Input
                  id={`guest-additional-name-${index}`}
                  name={`additional_name_${index}`}
                  type="text"
                  placeholder="Name"
                  disabled={isAddPending}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label
                htmlFor="guest-household"
                className="text-[14px] font-medium text-ink"
              >
                Household
              </label>
              <Input
                id="guest-household"
                name="household"
                type="text"
                placeholder="e.g. Smith family"
                disabled={isAddPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="guest-email"
                className="text-[14px] font-medium text-ink"
              >
                Email
              </label>
              <Input
                id="guest-email"
                name="email"
                type="email"
                placeholder="guest@email.com"
                disabled={isAddPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="guest-party-size"
                className="text-[14px] font-medium text-ink"
              >
                Party size
              </label>
              <Input
                id="guest-party-size"
                name="party_size"
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => {
                  const next = Math.max(1, Number(e.target.value) || 1);
                  setPartySize(next);
                }}
                disabled={isAddPending}
              />
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={isAddPending}>
            {isAddPending ? "Adding…" : "Add guest"}
          </Button>
        </form>
      </Card>

      <Card className="px-6 py-5">
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <Eyebrow>Bulk add</Eyebrow>
            <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Paste a list
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              One name per line. Each becomes a guest with party size 1.
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="guest-bulk"
              className="text-[14px] font-medium text-ink"
            >
              Names
            </label>
            <Textarea
              id="guest-bulk"
              name="names"
              rows={6}
              placeholder={"Maya Chen\nTheo Rivera\nPriya Patel"}
              disabled={isBulkPending}
            />
          </div>
          <Button type="submit" variant="primary" disabled={isBulkPending}>
            {isBulkPending ? "Adding…" : "Bulk add"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
