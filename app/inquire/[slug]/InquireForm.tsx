"use client";

import { useState, useTransition } from "react";
import { submitInquiry } from "@/app/inquire/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = "idle" | "success" | "error" | "throttled";

export function InquireForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitInquiry({
        slug,
        name,
        email,
        message,
        weddingDate,
        guestCount,
        honeypot,
      });
      if (result.ok) {
        setFormState("success");
        setName("");
        setEmail("");
        setWeddingDate("");
        setGuestCount("");
        setMessage("");
        return;
      }
      setFormState(result.reason === "throttled" ? "throttled" : "error");
    });
  }

  if (formState === "success") {
    return (
      <p className="text-[15px] font-medium text-ink">
        Thanks — your inquiry is in. They&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4">
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="inquire-website">Website</label>
        <input
          id="inquire-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="inquire-name" className="text-sm font-medium text-ink">
          Your names
        </label>
        <Input
          id="inquire-name"
          name="name"
          type="text"
          required
          maxLength={120}
          disabled={isPending}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jordan & Alex"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="inquire-email" className="text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="inquire-email"
          name="email"
          type="email"
          required
          maxLength={254}
          disabled={isPending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="inquire-date"
            className="text-sm font-medium text-ink"
          >
            Wedding date
          </label>
          <Input
            id="inquire-date"
            name="wedding_date"
            type="date"
            disabled={isPending}
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="inquire-guests"
            className="text-sm font-medium text-ink"
          >
            Approx. guest count
          </label>
          <Input
            id="inquire-guests"
            name="guest_count"
            type="number"
            min={1}
            max={20000}
            inputMode="numeric"
            disabled={isPending}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="inquire-message"
          className="text-sm font-medium text-ink"
        >
          Message
        </label>
        <Textarea
          id="inquire-message"
          name="message"
          rows={5}
          maxLength={4000}
          disabled={isPending}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {formState === "throttled" ? (
        <p className="text-[13px] text-rosewood" role="alert">
          Too many attempts. Wait a minute and try again.
        </p>
      ) : null}
      {formState === "error" ? (
        <p className="text-[13px] text-rosewood" role="alert">
          Something went wrong. Try again.
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
