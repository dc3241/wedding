"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { bootstrapAccountAndProject } from "@/app/(app)/projects/actions";

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

export function OnboardingForm() {
  const [choice, setChoice] = useState<AccountKindChoice>("couple");

  const accountKind = choice === "couple" ? "personal" : "business";
  const nameLabel =
    choice === "couple" ? "Your names" : "Business name";
  const namePlaceholder =
    choice === "couple" ? "Sarah & James" : "Bloom Wedding Co.";
  const projectLabel =
    choice === "couple" ? "Wedding name" : "First wedding / client";

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
              className={`cursor-pointer rounded-md border px-3 py-3 text-center text-sm transition-colors ${
                choice === "couple"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 hover:bg-zinc-50"
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
              className={`cursor-pointer rounded-md border px-3 py-3 text-center text-sm transition-colors ${
                choice === "planner"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 hover:bg-zinc-50"
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

        <div className="space-y-2">
          <label htmlFor="projectName" className="text-sm font-medium">
            {projectLabel}
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

        <SubmitButton />
      </form>
    </div>
  );
}
