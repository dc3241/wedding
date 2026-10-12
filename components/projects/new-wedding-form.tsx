"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cloneProjectTemplate,
  createProject,
} from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AccountPlan } from "@/lib/account-context";
import type { PlannerProjectSummary } from "@/lib/dashboard-aggregates";
import {
  defaultHiddenTools,
  EVENT_TYPE_OPTIONS,
  type EventType,
  type HideableTool,
} from "@/lib/event-type";
import { getCopy } from "@/lib/venue-copy";

type NewWeddingFormProps = {
  /** Active (non-archived) projects on this business account — template sources. */
  templateSources?: PlannerProjectSummary[];
  plan?: AccountPlan;
};

export function NewWeddingForm({
  templateSources = [],
  plan = "planner",
}: NewWeddingFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [includeSeating, setIncludeSeating] = useState(true);
  const [includeWebsite, setIncludeWebsite] = useState(true);
  const [isPending, startTransition] = useTransition();

  function resetFormState() {
    setError(null);
    setConfirmation(null);
    setCreatedProjectId(null);
    setEventType("wedding");
    setIncludeSeating(true);
    setIncludeWebsite(true);
  }

  function changeEventType(next: EventType) {
    setEventType(next);
    const hidden = defaultHiddenTools(next);
    setIncludeSeating(!hidden.includes("seating"));
    setIncludeWebsite(!hidden.includes("website"));
  }

  function openProject(projectId: string) {
    resetFormState();
    setOpen(false);
    router.push(`/projects/${projectId}`);
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setConfirmation(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string) ?? "";
    const sourceProjectId = (
      (formData.get("templateSource") as string) ?? ""
    ).trim();

    const hiddenTools: HideableTool[] = [];
    if (!includeSeating) hiddenTools.push("seating");
    if (!includeWebsite) hiddenTools.push("website");

    startTransition(async () => {
      const result = await createProject(name, {
        eventType,
        hiddenTools,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (sourceProjectId) {
        const sourceName =
          templateSources.find((p) => p.id === sourceProjectId)?.name ??
          getCopy("selectedProject", plan);
        const cloneResult = await cloneProjectTemplate(
          sourceProjectId,
          result.projectId,
        );
        if (!cloneResult.ok) {
          setError(
            `${getCopy("templateCopyFailed", plan)}${cloneResult.error}`,
          );
          setCreatedProjectId(result.projectId);
          router.refresh();
          return;
        }
        setConfirmation(
          `Checklist, budget categories, and vendor targets copied from ${sourceName}`,
        );
        setCreatedProjectId(result.projectId);
        form.reset();
        router.refresh();
        return;
      }

      form.reset();
      openProject(result.projectId);
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        {getCopy("newProject", plan)}
      </Button>
    );
  }

  if (createdProjectId && confirmation) {
    return (
      <Card className="p-4">
        <p className="text-sm text-sage">{confirmation}</p>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={() => openProject(createdProjectId)}>
            {getCopy("openProject", plan)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetFormState();
              setOpen(false);
              router.refresh();
            }}
          >
            Done
          </Button>
        </div>
      </Card>
    );
  }

  if (createdProjectId && error) {
    return (
      <Card className="p-4">
        <p className="text-sm text-rosewood">{error}</p>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={() => openProject(createdProjectId)}>
            {getCopy("openProject", plan)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetFormState();
              setOpen(false);
              router.refresh();
            }}
          >
            Dismiss
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="new-event-type"
              className="text-sm font-medium text-ink"
            >
              Type
            </label>
            <Select
              id="new-event-type"
              name="eventType"
              disabled={isPending}
              value={eventType}
              onChange={(e) =>
                changeEventType(e.target.value === "event" ? "event" : "wedding")
              }
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="new-wedding-name"
              className="text-sm font-medium text-ink"
            >
              {getCopy("projectNameLabel", plan)}
            </label>
            <Input
              id="new-wedding-name"
              name="name"
              type="text"
              required
              disabled={isPending}
              placeholder="Emma & Noah — June 2027"
            />
          </div>
          {templateSources.length > 0 ? (
            <div className="space-y-1.5">
              <label
                htmlFor="new-wedding-template"
                className="text-sm font-medium text-ink"
              >
                Start from
              </label>
              <Select
                id="new-wedding-template"
                name="templateSource"
                disabled={isPending}
                defaultValue=""
              >
                <option value="">Start blank</option>
                {templateSources.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={includeSeating}
                disabled={isPending}
                onChange={(e) => setIncludeSeating(e.target.checked)}
              />
              Seating chart
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={includeWebsite}
                disabled={isPending}
                onChange={(e) => setIncludeWebsite(e.target.checked)}
              />
              Website
            </label>
          </div>
          {error ? <p className="text-sm text-rosewood">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              resetFormState();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
