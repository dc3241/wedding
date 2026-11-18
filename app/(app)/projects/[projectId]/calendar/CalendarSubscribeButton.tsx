"use client";

import { useCallback, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { appOrigin } from "@/lib/url";
import { getCalendarFeedToken } from "./actions";

/** CAL-FEED-01 — subscribe to this wedding in Google / Apple / Outlook. */
export function CalendarSubscribeButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const close = useCallback(() => setOpen(false), []);

  function load(reset: boolean) {
    startTransition(async () => {
      setError(null);
      setCopied(false);
      const result = await getCalendarFeedToken(projectId, reset);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(result.token);
    });
  }

  const httpsUrl = token ? `${appOrigin()}/cal/${token}.ics` : "";
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Select the link and copy it.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="text-[13px] !px-3.5 !py-2"
        onClick={() => {
          setOpen(true);
          if (!token) load(false);
        }}
      >
        Add to my calendar
      </Button>
      {open ? (
        <Modal onClose={close} labelledBy="cal-subscribe-title">
          <h2 id="cal-subscribe-title" className="text-[20px] font-medium text-ink">
            Add to your calendar
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            Your wedding day, appointments, payment due dates, and checklist
            deadlines show up in your own calendar and stay up to date. Updates
            can take a few hours to appear.
          </p>

          {token ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  prefetch={false}
                >
                  Google Calendar
                </ButtonLink>
                <ButtonLink href={webcalUrl} variant="secondary" prefetch={false}>
                  Apple / Outlook
                </ButtonLink>
              </div>
              <label className="mt-5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted" htmlFor="cal-feed-url">
                Or copy the link
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="cal-feed-url"
                  readOnly
                  value={httpsUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-[var(--radius-inner)] bg-well px-3 py-2 text-[13px] text-ink shadow-recessed"
                />
                <Button type="button" variant="secondary" onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-4 text-[13px] text-muted">
                Anyone with this link can see these dates.{" "}
                <button
                  type="button"
                  className="font-semibold text-accent hover:opacity-80"
                  disabled={isPending}
                  onClick={() => load(true)}
                >
                  {isPending ? "Resetting…" : "Reset link"}
                </button>{" "}
                to turn off old copies.
              </p>
            </>
          ) : (
            <p className="mt-4 text-[14px] text-muted" role="status">
              {isPending ? "Creating your link…" : null}
            </p>
          )}

          {error ? (
            <p className="mt-3 text-[13px] text-rosewood" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="secondary" onClick={close}>
              Done
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
