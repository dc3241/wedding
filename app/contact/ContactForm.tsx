"use client";

import { submitContactMessage } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useTransition } from "react";

type FormState = "idle" | "success" | "invalid" | "send_failed";

const SUPPORT_EMAIL = "hello@usefirstlook.app";

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitContactMessage(formData);
      if (result.ok) {
        setFormState("success");
        return;
      }
      setFormState(result.reason);
    });
  }

  if (formState === "success") {
    return (
      <div className="text-center">
        <Eyebrow className="mb-3 block">Contact</Eyebrow>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
          Message sent
        </h1>
        <p className="mt-4 text-[15px] font-medium text-muted">
          Thanks — we got your note and will reply by email.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <Eyebrow className="mb-3 block">Contact</Eyebrow>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
          Get in touch
        </h1>
        <p className="mt-3 text-[15px] font-medium text-muted">
          Questions about First Look? Send a note — we read every one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-4">
        <div
          className="absolute -left-[9999px] h-px w-px overflow-hidden"
          aria-hidden
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-name" className="text-sm font-medium text-ink">
            Name
          </label>
          <Input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={120}
            disabled={isPending}
            autoComplete="name"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="contact-email"
            className="text-sm font-medium text-ink"
          >
            Email
          </label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            disabled={isPending}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="contact-audience"
            className="text-sm font-medium text-ink"
          >
            I am a...
          </label>
          <Select
            id="contact-audience"
            name="audience"
            required
            defaultValue=""
            disabled={isPending}
          >
            <option value="" disabled>
              Select one
            </option>
            <option value="couple">Couple</option>
            <option value="planner_or_venue">Planner or venue</option>
            <option value="press_or_other">Press or other</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="contact-message"
            className="text-sm font-medium text-ink"
          >
            Message
          </label>
          <Textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            maxLength={4000}
            disabled={isPending}
          />
        </div>

        {formState === "invalid" ? (
          <p className="text-[13px] text-muted" role="alert">
            Please fill in your name, email, and message.
          </p>
        ) : null}
        {formState === "send_failed" ? (
          <p className="text-[13px] text-muted" role="status">
            Email us directly at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-accent no-underline hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </>
  );
}
