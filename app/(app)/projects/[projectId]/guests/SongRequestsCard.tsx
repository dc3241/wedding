"use client";

import { useState, useTransition } from "react";
import { setSongRequestsEnabled } from "./meal-actions";
import type { SongRequestEntry } from "./rsvp-submissions";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export function SongRequestsCard({
  projectId,
  songRequestsEnabled,
  songRequests,
}: {
  projectId: string;
  songRequestsEnabled: boolean;
  songRequests: SongRequestEntry[];
}) {
  const [songsOn, setSongsOn] = useState(songRequestsEnabled);
  const [songsMessage, setSongsMessage] = useState<string | null>(null);
  const [isSongsPending, startSongsTransition] = useTransition();

  function handleSongsToggle(next: boolean) {
    setSongsOn(next);
    setSongsMessage(null);
    startSongsTransition(async () => {
      const result = await setSongRequestsEnabled(projectId, next);
      if (result.ok) return;
      setSongsMessage("Could not save song requests.");
      setSongsOn(songRequestsEnabled);
    });
  }

  // Empty copy follows the live toggle; the list itself is historical and
  // still renders when the toggle is off but songs already exist.
  const showEmpty = songRequests.length === 0 && songsOn;
  const showList = songRequests.length > 0;

  return (
    <Card className="px-6 py-5">
      <div>
        <Eyebrow>RSVP</Eyebrow>
        <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Song requests
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Optionally collect song ideas when guests RSVP.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <label className="flex items-center gap-3 text-[14px] font-medium text-ink">
          <input
            id="song-requests-enabled"
            type="checkbox"
            checked={songsOn}
            onChange={(e) => handleSongsToggle(e.target.checked)}
            disabled={isSongsPending}
            className="size-4 rounded border-ring text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          Ask guests for a song request on the RSVP form
        </label>
        {songsMessage ? (
          <p className="text-[13px] font-medium text-rosewood" role="status">
            {songsMessage}
          </p>
        ) : null}
      </div>

      {showList || showEmpty ? (
        <div className="mt-6 space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Requested so far
          </p>

          {showEmpty ? (
            <p className="text-[13px] text-muted">No song requests yet.</p>
          ) : (
            <ul className="space-y-2">
              {songRequests.map((entry, index) => (
                <li
                  key={`${entry.submittedAt}-${entry.song}-${entry.guestName}-${index}`}
                  className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
                >
                  <p className="text-[15px] font-medium text-ink">{entry.song}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{entry.guestName}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}
