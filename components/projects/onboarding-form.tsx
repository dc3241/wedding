"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  bootstrapAccountAndProject,
  bootstrapAccountWithVenueIntent,
} from "@/app/(app)/projects/actions";

type AccountKindChoice = "couple" | "planner";

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

function VenueIntentLink() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={bootstrapAccountWithVenueIntent}
      formNoValidate
      disabled={pending}
      className="text-[13px] font-medium text-muted underline-offset-2 hover:text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
    >
      Running a venue instead?
    </button>
  );
}

export function OnboardingForm() {
  const [choice, setChoice] = useState<AccountKindChoice>("couple");

  const accountKind = choice === "couple" ? "personal" : "business";
  const nameLabel =
    choice === "couple" ? "Your names" : "Business name";
  const namePlaceholder =
    choice === "couple" ? "Sarah & James" : "Bloom Wedding Co.";

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome
        </h1>
        <p className="text-sm text-zinc-500">
          Let&apos;s set up your account
        </p>
      </div>

      <form action={bootstrapAccountAndProject} className="space-y-5">
        <input type="hidden" name="accountKind" value={accountKind} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Are you planning your own wedding, or are you a planner managing
            clients?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`cursor-pointer rounded-[var(--radius-inner)] border px-3 py-3 text-center text-sm font-medium transition-colors ${
                choice === "couple"
                  ? "border-accent bg-accent text-surface shadow-raised"
                  : "border-ring bg-surface text-ink hover:bg-well"
              }`}
            >
              <input
                type="radio"
                name="kindChoice"
                value="couple"
                checked={choice === "couple"}
                onChange={() => setChoice("couple")}
                className="sr-only"
              />
              My own wedding
            </label>
            <label
              className={`cursor-pointer rounded-[var(--radius-inner)] border px-3 py-3 text-center text-sm font-medium transition-colors ${
                choice === "planner"
                  ? "border-accent bg-accent text-surface shadow-raised"
                  : "border-ring bg-surface text-ink hover:bg-well"
              }`}
            >
              <input
                type="radio"
                name="kindChoice"
                value="planner"
                checked={choice === "planner"}
                onChange={() => setChoice("planner")}
                className="sr-only"
              />
              I&apos;m a planner
            </label>
          </div>
          <div className="flex justify-end pt-1">
            <VenueIntentLink />
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
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
