"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  bootstrapAccountAndProject,
  bootstrapAccountWithVenueIntent,
} from "@/app/(app)/projects/actions";

type AccountKindChoice = "couple" | "planner" | "venue";

const KIND_OPTIONS: {
  value: AccountKindChoice;
  label: string;
}[] = [
  { value: "couple", label: "We're a couple" },
  { value: "planner", label: "I'm a planner" },
  { value: "venue", label: "I run a venue" },
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Setting up…" : "Get started"}
    </button>
  );
}

export function OnboardingForm() {
  const [choice, setChoice] = useState<AccountKindChoice>("couple");

  const accountKind = choice === "couple" ? "personal" : "business";
  const nameLabel =
    choice === "couple"
      ? "Your names"
      : choice === "venue"
        ? "Venue name"
        : "Business name";
  const namePlaceholder =
    choice === "couple"
      ? "Sarah & James"
      : choice === "venue"
        ? "The Garden Estate"
        : "Bloom Wedding Co.";

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome
        </h1>
        <p className="text-sm text-zinc-500">
          Let&apos;s set up your account
        </p>
      </div>

      <form
        action={
          choice === "venue"
            ? bootstrapAccountWithVenueIntent
            : bootstrapAccountAndProject
        }
        className="space-y-5"
      >
        <input type="hidden" name="accountKind" value={accountKind} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            How will you use First Look?
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {KIND_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-[var(--radius-inner)] border px-3 py-3 text-center text-sm font-medium transition-colors ${
                  choice === option.value
                    ? "border-accent bg-accent text-surface shadow-raised"
                    : "border-ring bg-surface text-ink hover:bg-well"
                }`}
              >
                <input
                  type="radio"
                  name="kindChoice"
                  value={option.value}
                  checked={choice === option.value}
                  onChange={() => setChoice(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="accountName" className="text-sm font-medium">
            {nameLabel}
          </label>
          <input
            id="accountName"
            name="accountName"
            type="text"
            required
            placeholder={namePlaceholder}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {choice === "couple" ? (
          <div className="space-y-2">
            <label htmlFor="projectName" className="text-sm font-medium">
              Wedding name
            </label>
            <input
              id="projectName"
              name="projectName"
              type="text"
              required
              placeholder="Sarah & James — Oct 2026"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
