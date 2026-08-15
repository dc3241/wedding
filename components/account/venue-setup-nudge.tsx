"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dismissTour } from "@/lib/tours/actions";
import {
  VENUE_BRANDING_NUDGE_KEY,
  VENUE_TEAM_NUDGE_KEY,
} from "@/lib/tours/venue-nudge";

type VenueSetupNudgeProps = {
  showBranding: boolean;
  showTeam: boolean;
};

export function VenueSetupNudge({
  showBranding,
  showTeam,
}: VenueSetupNudgeProps) {
  const router = useRouter();
  const [brandingOpen, setBrandingOpen] = useState(showBranding);
  const [teamOpen, setTeamOpen] = useState(showTeam);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  if (!brandingOpen && !teamOpen) {
    return null;
  }

  async function complete(key: string, href: string) {
    setPendingKey(key);
    try {
      await dismissTour(key, "completed");
      router.push(href);
    } catch {
      setPendingKey(null);
    }
  }

  async function skip(key: string, hide: () => void) {
    setPendingKey(key);
    hide();
    try {
      await dismissTour(key, "skipped");
      router.refresh();
    } catch {
      setPendingKey(null);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Your venue plan is live
      </h2>
      <div className="mt-4 space-y-3">
        {brandingOpen ? (
          <NudgeRow
            title="Add your brand colors & logo"
            pending={pendingKey !== null}
            onContinue={() =>
              complete(VENUE_BRANDING_NUDGE_KEY, "/account/branding")
            }
            onSkip={() =>
              skip(VENUE_BRANDING_NUDGE_KEY, () => setBrandingOpen(false))
            }
          />
        ) : null}
        {teamOpen ? (
          <NudgeRow
            title="Invite your team"
            pending={pendingKey !== null}
            onContinue={() => complete(VENUE_TEAM_NUDGE_KEY, "/account/team")}
            onSkip={() => skip(VENUE_TEAM_NUDGE_KEY, () => setTeamOpen(false))}
          />
        ) : null}
      </div>
    </Card>
  );
}

function NudgeRow({
  title,
  pending,
  onContinue,
  onSkip,
}: {
  title: string;
  pending: boolean;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={onContinue}
          className="min-w-0 flex-1 cursor-pointer text-left text-[15px] font-semibold text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {title}
        </button>
        <Button
          type="button"
          variant="ghost"
          className="w-full shrink-0 text-[13px] sm:w-auto"
          disabled={pending}
          onClick={onSkip}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
