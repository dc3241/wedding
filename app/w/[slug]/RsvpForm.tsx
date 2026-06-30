"use client";

import { useState, useTransition } from "react";
import { submitRsvp } from "./actions";
import { cn } from "@/lib/cn";

type RsvpFormProps = {
  slug: string;
};

type FormState = "idle" | "success" | "error";

export function RsvpForm({ slug }: RsvpFormProps) {
  const [name, setName] = useState("");
  const [response, setResponse] = useState<"yes" | "no" | "">("");
  const [partySize, setPartySize] = useState(1);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setFormState("idle");
    startTransition(async () => {
      const result = await submitRsvp({
        slug,
        name,
        response,
        partySize,
        email: email || undefined,
        message: message || undefined,
        honeypot,
      });

      if (result.ok) {
        setFormState("success");
        setName("");
        setResponse("");
        setPartySize(1);
        setEmail("");
        setMessage("");
      } else {
        setFormState("error");
      }
    });
  }

  if (formState === "success") {
    return (
      <p
        className="rounded-xl px-5 py-6 text-center text-[16px]"
        style={{ background: "var(--ws-tint)", color: "var(--ws-ink)" }}
        role="status"
      >
        Thank you — your RSVP is in.
      </p>
    );
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
  const inputStyle = {
    borderColor: "var(--ws-border)",
    background: "var(--ws-surface)",
    color: "var(--ws-ink)",
  } as const;

  return (
    <div className="space-y-5">
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="rsvp-website">Website</label>
        <input
          id="rsvp-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor="rsvp-name"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--ws-muted)" }}
        >
          Your name
        </label>
        <input
          id="rsvp-name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <fieldset>
        <legend
          className="mb-2 block text-[13px] font-medium"
          style={{ color: "var(--ws-muted)" }}
        >
          Will you attend?
        </legend>
        <div className="flex flex-wrap gap-3">
          {(["yes", "no"] as const).map((value) => (
            <label
              key={value}
              className={cn(
                "cursor-pointer rounded-lg border px-4 py-2 text-[14px] font-medium transition-colors",
                response === value ? "ring-2 ring-offset-1" : "",
              )}
              style={{
                borderColor: response === value ? "var(--ws-accent)" : "var(--ws-border)",
                background: response === value ? "var(--ws-tint)" : "var(--ws-surface)",
                color: "var(--ws-ink)",
              }}
            >
              <input
                type="radio"
                name="rsvp-response"
                value={value}
                checked={response === value}
                onChange={() => setResponse(value)}
                className="sr-only"
              />
              {value === "yes" ? "Joyfully accepts" : "Regretfully declines"}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="rsvp-party-size"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--ws-muted)" }}
        >
          Party size (including you)
        </label>
        <input
          id="rsvp-party-size"
          type="number"
          min={1}
          max={20}
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          className={cn(inputClass, "max-w-[8rem] tabular-nums")}
          style={inputStyle}
        />
      </div>

      <div>
        <label
          htmlFor="rsvp-email"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--ws-muted)" }}
        >
          Email <span className="font-normal">(optional)</span>
        </label>
        <input
          id="rsvp-email"
          type="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          style={inputStyle}
          autoComplete="email"
        />
      </div>

      <div>
        <label
          htmlFor="rsvp-message"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--ws-muted)" }}
        >
          Message <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="rsvp-message"
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={cn(inputClass, "resize-y")}
          style={inputStyle}
        />
      </div>

      {formState === "error" ? (
        <p className="text-[14px]" style={{ color: "var(--ws-accent-deep)" }} role="alert">
          Something went wrong — please try again.
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !name.trim() || !response}
        className="rounded-xl px-5 py-2.5 text-[15px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "var(--ws-accent)",
          color: "var(--ws-surface)",
        }}
      >
        {isPending ? "Sending…" : "Send RSVP"}
      </button>
    </div>
  );
}
