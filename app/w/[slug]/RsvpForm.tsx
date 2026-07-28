"use client";

import { useEffect, useState, useTransition } from "react";
import { submitRsvp } from "./actions";
import { cn } from "@/lib/cn";

export type PublicMealOption = {
  id: string;
  name: string;
  is_kids: boolean;
};

export type PublicMealServiceStyle =
  | "none"
  | "plated"
  | "buffet"
  | "family_style"
  | "stations";

type AttendeeDraft = {
  name: string;
  meal_option_id: string;
  dietary_note: string;
};

type RsvpFormProps = {
  slug: string;
  mealServiceStyle: PublicMealServiceStyle;
  mealOptions: PublicMealOption[];
};

type FormState = "idle" | "success" | "error";

function emptyAttendee(): AttendeeDraft {
  return { name: "", meal_option_id: "", dietary_note: "" };
}

function resizeAttendees(current: AttendeeDraft[], count: number): AttendeeDraft[] {
  const next = current.slice(0, count);
  while (next.length < count) {
    next.push(emptyAttendee());
  }
  return next;
}

export function RsvpForm({
  slug,
  mealServiceStyle,
  mealOptions,
}: RsvpFormProps) {
  const plated = mealServiceStyle === "plated" && mealOptions.length > 0;
  const buffetLike =
    mealServiceStyle === "buffet" ||
    mealServiceStyle === "family_style" ||
    mealServiceStyle === "stations";

  const [name, setName] = useState("");
  const [response, setResponse] = useState<"yes" | "no" | "">("");
  const [partySize, setPartySize] = useState(1);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([emptyAttendee()]);
  const [showDietaryDetails, setShowDietaryDetails] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (plated || (buffetLike && showDietaryDetails)) {
      setAttendees((current) => resizeAttendees(current, Math.max(1, partySize)));
    }
  }, [plated, buffetLike, showDietaryDetails, partySize]);

  function updateAttendee(
    index: number,
    field: keyof AttendeeDraft,
    value: string,
  ) {
    setAttendees((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function handlePartySizeChange(value: number) {
    const next = Math.min(20, Math.max(1, Math.floor(Number(value)) || 1));
    setPartySize(next);
  }

  function handleSubmit() {
    setFormState("idle");
    startTransition(async () => {
      let payloadAttendees: Array<{
        name?: string;
        meal_option_id?: string | null;
        dietary_note?: string;
      }> = [];

      if (response === "yes" && plated) {
        payloadAttendees = attendees.map((row) => ({
          name: row.name.trim(),
          meal_option_id: row.meal_option_id || null,
          dietary_note: row.dietary_note.trim() || undefined,
        }));
      } else if (response === "yes" && buffetLike && showDietaryDetails) {
        payloadAttendees = attendees
          .filter((row) => row.name.trim() || row.dietary_note.trim())
          .map((row) => ({
            name: row.name.trim() || undefined,
            dietary_note: row.dietary_note.trim() || undefined,
            meal_option_id: null,
          }));
      }

      const result = await submitRsvp({
        slug,
        name,
        response,
        partySize: plated && response === "yes" ? attendees.length : partySize,
        email: email || undefined,
        message: message || undefined,
        honeypot,
        attendees: payloadAttendees,
      });

      if (result.ok) {
        setFormState("success");
        setName("");
        setResponse("");
        setPartySize(1);
        setEmail("");
        setMessage("");
        setAttendees([emptyAttendee()]);
        setShowDietaryDetails(false);
      } else {
        setFormState("error");
      }
    });
  }

  const platedReady =
    !plated ||
    response !== "yes" ||
    (attendees.length >= 1 &&
      attendees.every((row) => row.name.trim() && row.meal_option_id));

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

  // style=none or plated-with-zero-options: classic headcount (unchanged / misconfig fallback).
  // Buffet-like: headcount only after Yes.
  const showClassicPartySize =
    mealServiceStyle === "none" ||
    (mealServiceStyle === "plated" && mealOptions.length === 0) ||
    (response === "yes" && buffetLike);

  const showPlatedRows = response === "yes" && plated;
  const showBuffetDietary = response === "yes" && buffetLike;

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

      {showClassicPartySize ? (
        <div>
          <label
            htmlFor="rsvp-party-size"
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--ws-muted)" }}
          >
            {buffetLike || plated
              ? "How many attending? (including you)"
              : "Party size (including you)"}
          </label>
          <input
            id="rsvp-party-size"
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => handlePartySizeChange(Number(e.target.value))}
            className={cn(inputClass, "max-w-[8rem] tabular-nums")}
            style={inputStyle}
          />
        </div>
      ) : null}

      {showPlatedRows ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="rsvp-attending-count"
              className="mb-1.5 block text-[13px] font-medium"
              style={{ color: "var(--ws-muted)" }}
            >
              How many attending? (including you)
            </label>
            <input
              id="rsvp-attending-count"
              type="number"
              min={1}
              max={20}
              value={partySize}
              onChange={(e) => handlePartySizeChange(Number(e.target.value))}
              className={cn(inputClass, "max-w-[8rem] tabular-nums")}
              style={inputStyle}
            />
          </div>

          <ul className="space-y-3">
            {attendees.map((row, index) => (
              <li
                key={index}
                className="space-y-3 rounded-lg border p-4"
                style={{ borderColor: "var(--ws-border)", background: "var(--ws-surface)" }}
              >
                <p
                  className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--ws-muted)" }}
                >
                  Guest {index + 1}
                </p>
                <div>
                  <label
                    htmlFor={`rsvp-attendee-name-${index}`}
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: "var(--ws-muted)" }}
                  >
                    Name
                  </label>
                  <input
                    id={`rsvp-attendee-name-${index}`}
                    type="text"
                    required
                    maxLength={120}
                    value={row.name}
                    onChange={(e) => updateAttendee(index, "name", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`rsvp-attendee-meal-${index}`}
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: "var(--ws-muted)" }}
                  >
                    Meal
                  </label>
                  <select
                    id={`rsvp-attendee-meal-${index}`}
                    required
                    value={row.meal_option_id}
                    onChange={(e) =>
                      updateAttendee(index, "meal_option_id", e.target.value)
                    }
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">Select a meal</option>
                    {mealOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.is_kids ? `${option.name} (kids)` : option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`rsvp-attendee-dietary-${index}`}
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: "var(--ws-muted)" }}
                  >
                    Dietary note <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    id={`rsvp-attendee-dietary-${index}`}
                    type="text"
                    maxLength={500}
                    value={row.dietary_note}
                    onChange={(e) =>
                      updateAttendee(index, "dietary_note", e.target.value)
                    }
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showBuffetDietary ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setShowDietaryDetails((open) => {
                const next = !open;
                if (next) {
                  setAttendees((current) =>
                    resizeAttendees(current, Math.max(1, partySize)),
                  );
                }
                return next;
              });
            }}
            className="text-[14px] font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--ws-accent)" }}
          >
            {showDietaryDetails
              ? "Hide names / dietary needs"
              : "Add names / dietary needs (optional)"}
          </button>

          {showDietaryDetails ? (
            <ul className="space-y-3">
              {attendees.map((row, index) => (
                <li
                  key={index}
                  className="space-y-3 rounded-lg border p-4"
                  style={{
                    borderColor: "var(--ws-border)",
                    background: "var(--ws-surface)",
                  }}
                >
                  <p
                    className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: "var(--ws-muted)" }}
                  >
                    Guest {index + 1}
                  </p>
                  <div>
                    <label
                      htmlFor={`rsvp-buffet-name-${index}`}
                      className="mb-1.5 block text-[13px] font-medium"
                      style={{ color: "var(--ws-muted)" }}
                    >
                      Name <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id={`rsvp-buffet-name-${index}`}
                      type="text"
                      maxLength={120}
                      value={row.name}
                      onChange={(e) => updateAttendee(index, "name", e.target.value)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`rsvp-buffet-dietary-${index}`}
                      className="mb-1.5 block text-[13px] font-medium"
                      style={{ color: "var(--ws-muted)" }}
                    >
                      Dietary needs <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id={`rsvp-buffet-dietary-${index}`}
                      type="text"
                      maxLength={500}
                      value={row.dietary_note}
                      onChange={(e) =>
                        updateAttendee(index, "dietary_note", e.target.value)
                      }
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

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
        disabled={isPending || !name.trim() || !response || !platedReady}
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
