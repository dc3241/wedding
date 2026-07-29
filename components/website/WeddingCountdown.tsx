"use client";

import { useEffect, useState } from "react";

function partsUntil(weddingDate: string) {
  const now = new Date();
  const wedding = new Date(weddingDate + "T00:00:00");
  const diff = Math.max(0, wedding.getTime() - now.getTime());
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

type WeddingCountdownProps = {
  weddingDate: string;
  align?: "left" | "center";
  /** Light text for photo heroes. */
  onPhoto?: boolean;
};

export function WeddingCountdown({
  weddingDate,
  align = "center",
  onPhoto = false,
}: WeddingCountdownProps) {
  // Null until mount so SSR + first client paint match (avoids Date.now hydration mismatch).
  const [parts, setParts] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    setParts(partsUntil(weddingDate));
    const interval = window.setInterval(() => {
      setParts(partsUntil(weddingDate));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [weddingDate]);

  const display = parts ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const units = [
    { n: display.days, l: "Days" },
    { n: display.hours, l: "Hours" },
    { n: display.minutes, l: "Min" },
    { n: display.seconds, l: "Sec" },
  ];

  const numColor = onPhoto ? "#ffffff" : "var(--ws-accent)";
  const labelColor = onPhoto ? "rgba(255,255,255,0.85)" : "var(--ws-muted)";

  return (
    <div
      className={
        align === "left"
          ? "mt-11 flex gap-[26px]"
          : "mt-11 flex justify-center gap-[26px]"
      }
      aria-hidden={parts == null}
    >
      {units.map((unit) => (
        <div key={unit.l} className="text-center">
          <div
            className="font-serif-display tabnum text-[40px] leading-none"
            style={{
              color: numColor,
              opacity: parts == null ? 0 : undefined,
            }}
          >
            {unit.n}
          </div>
          <div
            className="mt-2 text-[10.5px] tracking-[0.2em] uppercase"
            style={{ color: labelColor }}
          >
            {unit.l}
          </div>
        </div>
      ))}
    </div>
  );
}
