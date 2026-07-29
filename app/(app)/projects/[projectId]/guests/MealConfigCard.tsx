"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  addMealOption,
  deleteMealOption,
  setMealServiceStyle,
  updateMealOption,
} from "./meal-actions";
import {
  MEAL_SERVICE_STYLES,
  type MealOption,
  type MealServiceStyle,
} from "./meal-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function MealConfigCard({
  projectId,
  hasWebsite,
  mealServiceStyle,
  mealSelectionActive,
  mealOptions,
}: {
  projectId: string;
  hasWebsite: boolean;
  mealServiceStyle: MealServiceStyle;
  mealSelectionActive: boolean;
  mealOptions: MealOption[];
}) {
  const [style, setStyle] = useState<MealServiceStyle>(mealServiceStyle);
  const [styleMessage, setStyleMessage] = useState<string | null>(null);
  const [isStylePending, startStyleTransition] = useTransition();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsKids, setNewIsKids] = useState(false);
  const [isAddPending, startAddTransition] = useTransition();

  const showPlatedNudge = mealSelectionActive && mealOptions.length === 0;

  function handleStyleChange(next: string) {
    if (!hasWebsite) return;
    const value = next as MealServiceStyle;
    setStyle(value);
    setStyleMessage(null);
    startStyleTransition(async () => {
      const result = await setMealServiceStyle(projectId, value);
      if (result.ok) return;
      if (result.reason === "no_website") {
        setStyleMessage("Create your wedding website first.");
        setStyle(mealServiceStyle);
        return;
      }
      setStyleMessage("Could not save service style.");
      setStyle(mealServiceStyle);
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;

    startAddTransition(async () => {
      await addMealOption(projectId, {
        name: newName,
        description: newDescription,
        is_kids: newIsKids,
        sort_order: mealOptions.length,
      });
      setNewName("");
      setNewDescription("");
      setNewIsKids(false);
    });
  }

  return (
    <Card className="px-6 py-5">
      <div>
        <Eyebrow>Catering</Eyebrow>
        <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Catering / Meals
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Choose how dinner is served and the meal choices guests can pick.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <label
          htmlFor="meal-service-style"
          className="text-[14px] font-medium text-ink"
        >
          Service style
        </label>
        {!hasWebsite ? (
          <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
            <p className="text-[14px] font-medium text-ink">
              Set up your wedding website first
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Service style lives on your wedding website. Meal options below
              stay editable either way.
            </p>
            <Link
              href={`/projects/${projectId}/website`}
              className="mt-2 inline-block text-[14px] font-semibold text-accent hover:underline"
            >
              Open website settings
            </Link>
          </div>
        ) : (
          <>
            <Select
              id="meal-service-style"
              value={style}
              onChange={(e) => handleStyleChange(e.target.value)}
              disabled={isStylePending}
            >
              {MEAL_SERVICE_STYLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {styleMessage ? (
              <p className="text-[13px] font-medium text-rosewood" role="status">
                {styleMessage}
              </p>
            ) : null}
          </>
        )}
      </div>

      {showPlatedNudge ? (
        <p
          className="mt-4 rounded-[var(--radius-inner)] bg-accent-wash px-4 py-3 text-[14px] font-medium text-ink"
          role="status"
        >
          Add your meal choices so guests can pick
        </p>
      ) : null}

      {mealSelectionActive ? (
        <div className="mt-6 space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Meal options
          </p>

          {mealOptions.length === 0 ? (
            <p className="text-[13px] text-muted">No meal options yet.</p>
          ) : (
            <ul className="space-y-2">
              {mealOptions.map((option) => (
                <MealOptionRow key={option.id} option={option} />
              ))}
            </ul>
          )}

          <form
            onSubmit={handleAdd}
            className="rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed space-y-3"
          >
            <p className="text-[14px] font-medium text-ink">Add meal option</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="meal-option-name"
                  className="text-[14px] font-medium text-ink"
                >
                  Name
                </label>
                <Input
                  id="meal-option-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Herb chicken"
                  required
                  disabled={isAddPending}
                  className="bg-surface"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="meal-option-description"
                  className="text-[14px] font-medium text-ink"
                >
                  Description{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <Textarea
                  id="meal-option-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Short note for guests"
                  disabled={isAddPending}
                  className="bg-surface"
                />
              </div>
              <label className="flex items-center gap-2 text-[14px] font-medium text-ink sm:col-span-2">
                <input
                  type="checkbox"
                  checked={newIsKids}
                  onChange={(e) => setNewIsKids(e.target.checked)}
                  disabled={isAddPending}
                  className="size-4 rounded border-ring text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                Kids meal
              </label>
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isAddPending || !newName.trim()}
            >
              {isAddPending ? "Adding…" : "Add option"}
            </Button>
          </form>
        </div>
      ) : (
        <p className="mt-5 text-[13px] text-muted">
          Meal choices apply to plated service.
        </p>
      )}
    </Card>
  );
}

function MealOptionRow({ option }: { option: MealOption }) {
  const [name, setName] = useState(option.name);
  const [description, setDescription] = useState(option.description ?? "");
  const [isKids, setIsKids] = useState(option.is_kids);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await updateMealOption(option.id, {
        name,
        description,
        is_kids: isKids,
      });
      setIsEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteMealOption(option.id);
    });
  }

  if (!isEditing) {
    return (
      <li className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-ink">
            {option.name}
            {option.is_kids ? (
              <span className="ml-2 rounded-[var(--radius-pill)] bg-accent-wash px-2 py-0.5 text-[12px] font-semibold text-accent">
                Kids
              </span>
            ) : null}
          </p>
          {option.description ? (
            <p className="mt-0.5 text-[13px] text-muted">{option.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            className="py-1.5"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="py-1.5 text-muted hover:text-rosewood"
          >
            Delete
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-3 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
      <div className="space-y-1.5">
        <label
          htmlFor={`meal-edit-name-${option.id}`}
          className="text-[14px] font-medium text-ink"
        >
          Name
        </label>
        <Input
          id={`meal-edit-name-${option.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="bg-surface"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`meal-edit-description-${option.id}`}
          className="text-[14px] font-medium text-ink"
        >
          Description
        </label>
        <Textarea
          id={`meal-edit-description-${option.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={isPending}
          className="bg-surface"
        />
      </div>
      <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
        <input
          type="checkbox"
          checked={isKids}
          onChange={(e) => setIsKids(e.target.checked)}
          disabled={isPending}
          className="size-4 rounded border-ring text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        Kids meal
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={isPending || !name.trim()}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => {
            setName(option.name);
            setDescription(option.description ?? "");
            setIsKids(option.is_kids);
            setIsEditing(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </li>
  );
}
